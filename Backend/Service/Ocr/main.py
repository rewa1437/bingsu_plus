import os
import queue
import re
import threading
import time
import uuid
import pdfplumber
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeoutError

api_key = 'sk-XqxS4Y61JCJa2NzDnPmz_A'
api_url = 'https://aigateway.ntictsolution.com/v1/chat/completions'

# จำกัด API calls ทั้งระบบ — รองรับหลาย user พร้อมกัน (70+ users) ไม่ให้ overwhelm gateway
MAX_CONCURRENT_API_CALLS = int(os.environ.get("OCR_MAX_CONCURRENT_API", 20))
_api_semaphore = threading.Semaphore(MAX_CONCURRENT_API_CALLS)

# Job queue: จำกัดเวลาแต่ละงาน ถ้าค้างเกิน JOB_TIMEOUT จะ skip เพื่อไม่ให้ hold worker
JOB_TIMEOUT = int(os.environ.get("OCR_JOB_TIMEOUT", 300))  # วินาที (default 5 นาที)
JOB_QUEUE_WORKERS = int(os.environ.get("OCR_QUEUE_WORKERS", 3))  # จำนวน worker ประมวลผล PDF พร้อมกัน

# Session ต่อ thread เพื่อ reuse TCP connection (ลด latency แต่ละ request)
_thread_local = threading.local()

def _get_session():
    if not getattr(_thread_local, "session", None):
        _thread_local.session = requests.Session()
    return _thread_local.session

# เก็บ system prompt ไว้ครั้งเดียว แทนการสร้างใหม่ทุกครั้งที่เรียก
OCR_SYSTEM_PROMPT = (
    "คุณคือผู้เชี่ยวชาญด้านการตรวจแก้ข้อความจาก OCR หน้าที่ของคุณ: "
    "1. ตรวจสอบข้อความที่ได้จาก OCR "
    "2. เติมคำที่หายไป แก้คำสะกดผิด และแก้ตัวอักษรที่เพี้ยน "
    "3. ต้องรักษาความหมายเดิม 100% "
    "4. ห้ามเพิ่มข้อมูลใหม่ที่ไม่ได้อยู่ในบริบทเดิม "
    "5. หากไม่แน่ใจ ให้คาดเดาจากบริบทใกล้เคียงเท่านั้น "
    "6. ห้ามอธิบายกระบวนการ ให้แสดงเฉพาะข้อความที่แก้ไขแล้ว "
    "หลักการแก้ไข: เติมคำที่ขาดหายโดยอิงจากไวยากรณ์และบริบท; แก้คำที่ OCR อ่านผิด (เช่น rn→m, l→1, 0→O); คงรูปแบบเดิม เช่น ย่อหน้า ลำดับเลข หัวข้อ "
    "แสดงผลลัพธ์เป็นข้อความที่แก้ไขแล้วเท่านั้น"
)

# สำหรับโหมด batch: ให้ model คืนผลแยกหน้าด้วย separator นี้
BATCH_PAGE_SEP = "\n\n--- หน้า "
BATCH_PROMPT_EXTRA = " ห้ามอธิบายหรือเพิ่มคำนำ ตอบเฉพาะข้อความที่แก้แล้ว โดยคงรูปแบบ '--- หน้า N ---' ไว้ทุกหน้า (N เป็นเลขหน้า)"


# === Job Queue: เก็บงานไว้ในคิว ประมวลผลในพื้นหลัง ถ้าค้างจะ timeout ไม่ block service ===
_job_queue = queue.Queue()
_job_results = {}
_job_results_lock = threading.Lock()


def _queue_worker():
    """Worker ที่ดึงงานจากคิวมาประมวลผล ถ้าเกิน JOB_TIMEOUT จะ skip ไปงานถัดไป"""
    while True:
        try:
            job = _job_queue.get()
            if job is None:
                break
            job_id, pdf_path, max_workers, batch_size = job
            with _job_results_lock:
                _job_results[job_id]["status"] = "processing"
            try:
                with ThreadPoolExecutor(max_workers=1) as ex:
                    future = ex.submit(
                        process_pdf_pages_parallel,
                        pdf_path,
                        max_workers=max_workers,
                        batch_size=batch_size,
                    )
                    result = future.result(timeout=JOB_TIMEOUT)
                with _job_results_lock:
                    _job_results[job_id].update(status="done", result=result)
            except Exception as e:
                status = "timeout" if isinstance(e, FuturesTimeoutError) else "error"
                with _job_results_lock:
                    _job_results[job_id].update(
                        status=status,
                        error=str(e),
                    )
            finally:
                _job_queue.task_done()
        except Exception as e:
            print(f"Queue worker error: {e}")


_workers_start_lock = threading.Lock()

def _ensure_workers_started():
    with _workers_start_lock:
        if not getattr(_ensure_workers_started, "_started", False):
            _ensure_workers_started._started = True
            for _ in range(JOB_QUEUE_WORKERS):
                t = threading.Thread(target=_queue_worker, daemon=True)
                t.start()


def submit_ocr_job(pdf_path, max_workers=6, batch_size=5):
    """
    ส่งงาน OCR เข้าคิว — return ทันที ไม่ block
    ใช้ get_ocr_job_result(job_id) เพื่อดึงผลลัพธ์ (poll)

    Returns:
        job_id (str): ใช้สำหรับตรวจสอบสถานะและดึงผล
    """
    _ensure_workers_started()
    job_id = str(uuid.uuid4())
    with _job_results_lock:
        _job_results[job_id] = {"status": "pending"}
    _job_queue.put((job_id, pdf_path, max_workers, batch_size))
    return job_id


def get_ocr_job_result(job_id):
    """
    ดึงสถานะและผลลัพธ์ของงาน

    Returns:
        dict: {status: "pending"|"processing"|"done"|"error"|"timeout", result?: str, error?: str}
    """
    with _job_results_lock:
        return _job_results.get(job_id, {"status": "not_found"}).copy()


def chat_with_ai(messages, model='rnd-vllm/gpt-oss-120b', temperature=0.2, max_tokens=100000, system_prompt=None, session=None):
    """
    ส่งข้อความไปยัง LLM Gateway

    Args:
        messages (list): รายการข้อความในรูปแบบ [{"role": "user", "content": "..."}]
        model (str): โมเดลที่ต้องการใช้ (เช่น gpt-5-mini, claude-3-opus)
        temperature (float): ค่าความสุ่มของคำตอบ (0-1)
        max_tokens (int): จำนวน token สูงสุด
        session: requests.Session (optional) สำหรับ reuse connection

    Returns:
        dict: คำตอบจาก API
    """
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    if system_prompt:
        messages = [{"role": "system", "content": system_prompt}] + messages

    payload = {
        'model': model,
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens
    }

    # จำกัด API calls ทั้งระบบ — requests ที่เกินจะรอในคิว
    post = (session or _get_session()).post
    with _api_semaphore:
        try:
            response = post(
                api_url,
                headers=headers,
                json=payload,
                timeout=60,
                verify=False  # ปิดการตรวจสอบ SSL สำหรับ internal server
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f'เกิดข้อผิดพลาด: {e}')
            raise


def prepare_ocr_text(text, session=None):
    """ส่งข้อความจาก OCR ไปให้ AI แก้ไข คืนเฉพาะข้อความที่แก้แล้ว"""
    if not (text or str(text).strip()):
        return ""
    result = chat_with_ai(
        [{'role': 'user', 'content': f"นี่คือข้อความจาก OCR:\n\n{str(text).strip()}"}],
        system_prompt=OCR_SYSTEM_PROMPT,
        model='rnd-vllm/gpt-oss-120b',
        session=session,
    )
    ai_message = result['choices'][0]['message']
    return ai_message['content']


def _prepare_ocr_batch(page_texts_chunk, session=None):
    """ส่งหลายหน้าพร้อมกันในหนึ่ง request แล้วแยกผลลัพธ์ตาม separator"""
    if not page_texts_chunk:
        return []
    parts = [f"--- หน้า {i+1} ---\n\n{(t or '').strip()}" for i, t in enumerate(page_texts_chunk)]
    user_content = "นี่คือข้อความจาก OCR หลายหน้า (แยกด้วย '--- หน้า N ---'):\n\n" + "\n\n".join(parts)
    prompt = OCR_SYSTEM_PROMPT + BATCH_PROMPT_EXTRA
    result = chat_with_ai(
        [{'role': 'user', 'content': user_content}],
        system_prompt=prompt,
        model='rnd-vllm/gpt-oss-120b',
        session=session,
    )
    content = result['choices'][0]['message']['content']
    split_re = re.compile(r"---\s*หน้า\s*\d+\s*---\s*", re.IGNORECASE)
    blocks = [b.strip() for b in split_re.split(content) if b.strip()]
    n = len(page_texts_chunk)
    if len(blocks) >= n:
        return blocks[:n]
    # model ไม่ใส่ separator ครบ — ใช้ทั้งก้อนเป็นหน้าแรก ที่เหลือใช้ข้อความเดิม
    out = [content] if blocks else [""]
    while len(out) < n:
        out.append(page_texts_chunk[len(out)] or "")
    return out[:n]


def process_pdf_pages_parallel(pdf_path, max_workers=6, batch_size=0):
    """
    อ่าน PDF แล้วส่งแต่ละหน้าไปแก้ OCR แบบ parallel เพื่อให้เร็วขึ้น

    - max_workers: จำนวน thread ต่อ 1 PDF (ภายในจำกัดโดย semaphore ทั้งระบบ)
    - batch_size: ถ้า > 0 จะรวมหลายหน้าใน 1 request (เช่น 5 = 5 หน้า/request) ลดจำนวน API call
                  แนะนำใช้ batch_size=3~5 เมื่อมีหลาย user พร้อมกัน (70+)
    - ใช้ร่วมกับ OCR_MAX_CONCURRENT_API (env) เพื่อจำกัด API calls ทั้งระบบ (default: 20)
    """
    with pdfplumber.open(pdf_path) as pdf:
        page_texts = [(p.extract_text() or "").strip() for p in pdf.pages]

    n_pages = len(page_texts)
    results = [None] * n_pages

    if batch_size > 0:
        # โหมด batch: รวมหลายหน้าใน 1 request แล้วรันแต่ละ batch แบบ parallel
        chunks = [
            page_texts[i : i + batch_size]
            for i in range(0, n_pages, batch_size)
        ]
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_slice = {}
            for i, chunk in enumerate(chunks):
                start_idx = i * batch_size
                if not any(t for t in chunk):  # ข้าม chunk ที่ทุกหน้าว่าง
                    for j in range(len(chunk)):
                        if start_idx + j < n_pages:
                            results[start_idx + j] = ""
                    continue
                future_to_slice[executor.submit(_prepare_ocr_batch, chunk)] = (start_idx, chunk)
            for future in as_completed(future_to_slice):
                start_idx, chunk = future_to_slice[future]
                try:
                    corrected = future.result()
                    for j, text in enumerate(corrected):
                        if start_idx + j < n_pages:
                            results[start_idx + j] = text
                except Exception as e:
                    for j in range(len(chunk)):
                        if start_idx + j < n_pages:
                            results[start_idx + j] = f"[ หน้า {start_idx + j + 1}: เกิดข้อผิดพลาด - {e} ]"
    else:
        # โหมดเดิม: 1 request ต่อ 1 หน้า, เรียก parallel + reuse Session ต่อ thread
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_index = {
                executor.submit(prepare_ocr_text, text): i
                for i, text in enumerate(page_texts)
            }
            for future in as_completed(future_to_index):
                idx = future_to_index[future]
                try:
                    results[idx] = future.result()
                except Exception as e:
                    results[idx] = f"[ หน้า {idx + 1}: เกิดข้อผิดพลาด - {e} ]"

    return "\n\n".join(r or f"[ หน้า {i+1}: ไม่มีข้อความ ]" for i, r in enumerate(results))


if __name__ == "__main__":
    import sys
    # โหมด sync: รันแล้วรอผลตรงนี้ (เหมาะกับ CLI)
    if len(sys.argv) < 2 or sys.argv[1] != "--queue":
        start = time.perf_counter()
        path = sys.argv[1] if len(sys.argv) > 1 else "test_3.pdf"
        text = process_pdf_pages_parallel(path)
        elapsed = time.perf_counter() - start
        print(text)
        print(f"\n--- ใช้เวลาทั้งหมด: {elapsed:.2f} วินาที ---")
    else:
        # โหมด queue: ส่งงานเข้าคิว return ทันที, poll ผลลัพธ์ (เหมาะกับ web service)
        path = sys.argv[2] if len(sys.argv) > 2 else "test_3.pdf"
        job_id = submit_ocr_job(path, batch_size=5)
        print(f"Job สร้างแล้ว: {job_id}")
        while True:
            r = get_ocr_job_result(job_id)
            print(f"  สถานะ: {r['status']}")
            if r["status"] == "done":
                print(r.get("result", ""))
                break
            if r["status"] in ("error", "timeout"):
                print(f"  ข้อผิดพลาด: {r.get('error', '')}")
                break
            time.sleep(2)