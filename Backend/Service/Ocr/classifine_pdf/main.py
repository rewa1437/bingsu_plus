import fitz  # PyMuPDF
from enum import Enum
from pathlib import Path


class PDFType(str, Enum):
    """ประเภท PDF ตามลักษณะเนื้อหา"""
    PDF_TEXT = "PDF_TEXT"      # PDF ดิจิทัล มีข้อความเลือกได้
    PDF_SCAN = "PDF_SCAN"      # สแกนเป็นรูป ไม่มี/มีข้อความน้อย
    PDF_HYBRID = "PDF_HYBRID"  # ผสม ทั้งข้อความและรูปสแกน


def _total_image_coverage(page: "fitz.Page", threshold: float = 0.8) -> float:
    """
    คำนวณพื้นที่รวมของ images เทียบกับพื้นที่หน้า (รวมหลายรูปที่ซ้อนกัน)
    คืนค่าระหว่าง 0–1
    """
    page_area = page.rect.width * page.rect.height
    if page_area <= 0:
        return 0.0
    images = page.get_images(full=True)
    if not images:
        return 0.0
    total_image_area = 0.0
    for img in images:
        xref = img[0]
        for rect in page.get_image_rects(xref):
            total_image_area += rect.width * rect.height
    return total_image_area / page_area


def _has_significant_text(page: "fitz.Page", min_chars: int = 20) -> bool:
    """ตรวจว่าหน้ามีข้อความมากพอ (กรอง noise/watermark เล็กๆ)"""
    text = page.get_text("text").strip()
    return len(text) > min_chars


def classify_pdf(
    file_path: str | Path,
    *,
    image_threshold: float = 0.8,
    min_text_chars: int = 20,
    include_stats: bool = False,
) -> PDFType | dict:
    """
    จำแนกประเภท PDF: TEXT (ดิจิทัล), SCAN (สแกน), HYBRID (ผสม)

    Args:
        file_path: path ไปยังไฟล์ PDF
        image_threshold: ถ้า image กินพื้นที่เกินค่านี้ถือเป็น full-page image (0–1)
        min_text_chars: จำนวนตัวอักษรขั้นต่ำเพื่อนับว่าหน้ามีข้อความ
        include_stats: ถ้า True จะ return dict พร้อมสถิติ (type, text_pages, image_pages, total)

    Returns:
        PDFType หรือ dict (ถ้า include_stats=True)

    Raises:
        FileNotFoundError: ไม่พบไฟล์
        fitz.FileDataError: ไฟล์เสียหรือไม่ใช่ PDF
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"ไม่พบไฟล์: {path}")

    with fitz.open(path) as doc:
        total_pages = len(doc)
        if total_pages == 0:
            result_type = PDFType.PDF_HYBRID
            text_pages = image_pages = 0
        else:
            text_pages = 0
            image_pages = 0
            for page in doc:
                if _has_significant_text(page, min_text_chars):
                    text_pages += 1
                if _total_image_coverage(page, image_threshold) >= image_threshold:
                    image_pages += 1

            if text_pages == total_pages and image_pages == 0:
                result_type = PDFType.PDF_TEXT
            elif text_pages == 0 and image_pages == total_pages:
                result_type = PDFType.PDF_SCAN
            else:
                result_type = PDFType.PDF_HYBRID

    if include_stats:
        return {
            "type": result_type,
            "text_pages": text_pages,
            "image_pages": image_pages,
            "total_pages": total_pages,
        }
    return result_type


if __name__ == "__main__":
    import sys
    path = "test.pdf"
    result = classify_pdf(path, include_stats=True)
    if isinstance(result, dict):
        print(f"ประเภท: {result['type']}")
        print(f"สถิติ: {result['text_pages']} หน้ามีข้อความ / {result['image_pages']} หน้าสแกน / {result['total_pages']} หน้าทั้งหมด")
    else:
        print(f"ประเภทไฟล์: {result}")