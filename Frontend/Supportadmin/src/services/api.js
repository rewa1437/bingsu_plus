/**
 * API client สำหรับ Supportadmin ต่อ backend bb
 * ใช้ REACT_APP_API_BASE_URL ใน .env (เช่น http://localhost:5052 หรือ http://localhost:8080)
 */
const SESSION_KEY = 'supportadmin_token';
const USER_KEY = 'supportadmin_user';

export const getStoredToken = () => localStorage.getItem(SESSION_KEY);
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const setSession = (token, user) => {
  if (token) localStorage.setItem(SESSION_KEY, token);
  else localStorage.removeItem(SESSION_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
};

const getApiBaseURL = () => {
  if (process.env.REACT_APP_API_BASE_URL) return process.env.REACT_APP_API_BASE_URL.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return '';
  }
  return 'http://localhost:5052';
};

/** ข้อความสั้นเมื่อเชื่อมต่อ backend ไม่ได้ (ลงทะเบียน/ล็อกอิน) */
const CONNECTION_ERROR_MSG =
  'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจสอบว่า backend รันอยู่ และใน .env ตั้ง REACT_APP_API_BASE_URL ให้ชี้ไปพอร์ตที่ backend รัน (เช่น 5052 หรือ 8083) แล้ว restart แอป';

/** ตรวจว่าเป็นข้อความ error ที่เกี่ยวกับ network/vector/docker ที่ไม่ควรโชว์ให้ user */
const isConfusingErrorMessage = (s) => {
  const str = s != null && typeof s === 'object' ? (s.message || s.error || String(s)) : String(s || '');
  return (
    /network\s*error|แปลง\s*vector|docker\s*compose|backend\s*ล้ม|บันทึก.*vector|legacy\s*และ\s*api|ถ้าเกิดตอนกดบันทึก|ดู\s*docker|logs\s*legacy/i.test(str) ||
    (str.includes('Vector') && str.includes('backend'))
  );
};

/** ดึงข้อความจาก response body (รองรับทั้ง string และ object) */
const getResponseErrorText = (data) => {
  if (!data) return '';
  const raw = data.error ?? data.message ?? data.detail;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && typeof raw.message === 'string') return raw.message;
  if (raw && typeof raw === 'object' && typeof raw.error === 'string') return raw.error;
  return String(raw || '');
};

const request = async (path, options = {}) => {
  const token = getStoredToken();
  const url = `${getApiBaseURL()}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    const rawMsg = err?.message || '';
    if (isConfusingErrorMessage(rawMsg)) {
      throw new Error(CONNECTION_ERROR_MSG);
    }
    const base = getApiBaseURL() || (typeof window !== 'undefined' ? window.location?.origin : '') || '';
    const hint = base ? ` (เรียก ${base})` : '';
    throw new Error(
      `เชื่อมต่อ backend ไม่ได้${hint} — ตรวจสอบว่า backend รันอยู่ แล้วตั้ง REACT_APP_API_BASE_URL ใน .env ของ Supportadmin ให้ชี้ไปพอร์ตที่ backend รัน (เช่น http://localhost:5052) แล้ว restart แอป`
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = getResponseErrorText(data) || `HTTP ${res.status}`;
    if (typeof msg !== 'string') msg = String(msg);
    if (res.status === 401 && /invalid|expired|session|not authenticated/i.test(msg)) {
      setSession(null, null);
      throw new Error('SESSION_EXPIRED');
    }
    if (isConfusingErrorMessage(msg)) {
      msg = CONNECTION_ERROR_MSG;
    }
    throw new Error(msg);
  }
  return data;
};

export const api = {
  login: async (email, password) => {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) setSession(data.token, data.user);
    return data;
  },
  signup: async (name, email, password) => {
    const data = await request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    return data;
  },
  logout: () => setSession(null, null),
  getMe: () => request('/api/auth/me'),
  getReport: () => request('/api/support/report'),
  getMetrics: () => request('/api/admin/metrics'),
  getAdminActivity: (days = 14) => request(`/api/admin/activity?days=${encodeURIComponent(days)}`),
  getHealth: () => request('/api/health'),
  getPendingUsers: () => request('/api/support/pending-users'),
  updatePendingUser: (userId, approvalStatus) =>
    request(`/api/support/pending-users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ approvalStatus }),
    }),
  getLogs: () => request('/api/support/logs'),
  getAdminUsers: () => request('/api/admin/users'),
  getAdminBots: () => request('/api/admin/bots'),
  getAdminDocuments: () => request('/api/admin/documents'),
  getAdminDocument: (id) => request(`/api/admin/documents/${id}`),
  updateAdminBot: (id, payload) =>
    request(`/api/admin/bots/${id}`, { method: 'PATCH', body: JSON.stringify(payload || {}) }),
  getGuide: () => request('/api/admin/guide'),
  updateGuide: (text, mode = 'replace') =>
    request('/api/admin/guide', { method: 'PATCH', body: JSON.stringify({ text, mode }) }),
  deleteBot: (id) => request(`/api/admin/bots/${id}`, { method: 'DELETE' }),
  deleteDocument: (id) => request(`/api/admin/documents/${id}`, { method: 'DELETE' }),
};

const ROLE_LABELS = { user: 'ผู้ใช้งาน', support: 'ผู้ดูแล', admin: 'แอดมิน', admin_metrics: 'แอดมิน' };

/**
 * แปลง user จาก backend (pending-users) เป็นรูปแบบที่หน้า Support ใช้แสดง
 */
export function mapPendingUserToDisplay(backendUser) {
  const name = backendUser.name || backendUser.email || '-';
  const createdAt = backendUser.createdAt
    ? new Date(backendUser.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
  return {
    id: backendUser.id,
    username: name,
    name,
    email: backendUser.email || '',
    role: 'รอดำเนินการ',
    roleType: 'pending',
    lastActive: '-',
    createdAt,
    expiresAt: '-',
    isEnabled: false,
    avatar: (name.charAt(0) || '?').toUpperCase(),
    avatarColor: 'bg-gray-400',
    approvalStatus: backendUser.approvalStatus,
  };
}

/**
 * แปลง user จาก backend (admin/users) เป็นรูปแบบที่หน้า Support ใช้แสดง (ไม่เปลี่ยน UI)
 */
export function mapAdminUserToDisplay(backendUser) {
  const name = backendUser.name || backendUser.email || '-';
  const createdAt = backendUser.createdAt
    ? new Date(backendUser.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
  const roleType = backendUser.approvalStatus === 'pending' ? 'pending' : backendUser.role;
  const role = roleType === 'pending' ? 'รอดำเนินการ' : (ROLE_LABELS[backendUser.role] || backendUser.role);
  return {
    id: backendUser.id,
    username: name,
    name,
    email: backendUser.email || '',
    role,
    roleType,
    lastActive: '-',
    createdAt,
    expiresAt: '-',
    isEnabled: !!backendUser.isActive,
    avatar: (name.charAt(0) || '?').toUpperCase(),
    avatarColor: 'bg-gray-400',
    approvalStatus: backendUser.approvalStatus,
  };
}

const DEFAULT_AVATAR_COLORS = [
  'bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400',
  'bg-green-400', 'bg-yellow-400', 'bg-red-400', 'bg-teal-400',
  'bg-orange-400', 'bg-cyan-400', 'bg-lime-400', 'bg-rose-400',
  'bg-violet-400', 'bg-fuchsia-400', 'bg-emerald-400', 'bg-amber-400',
];

/**
 * แปลง bot จาก backend (admin/bots) เป็นรูปแบบที่หน้า Bots ใช้แสดง (ไม่เปลี่ยน UI)
 */
export function mapBotToDisplay(backendBot, index = 0, avatarColors = DEFAULT_AVATAR_COLORS) {
  const username = backendBot.owner?.name || backendBot.owner?.email || '-';
  const knowledge = (backendBot.documents || []).map((d) => d.displayName || d.name || '-');
  const color = avatarColors[index % avatarColors.length] || 'bg-blue-400';
  return {
    id: backendBot.id,
    name: backendBot.name || '-',
    description: backendBot.description || '',
    prompt: backendBot.prompt || '',
    username,
    enabled: true,
    knowledge,
    groups: [],
    color,
  };
}

/**
 * แปลง document จาก backend (admin/documents) เป็นรูปแบบที่หน้า Knowledge ใช้แสดง (ไม่เปลี่ยน UI)
 */
export function mapDocumentToDisplay(backendDoc) {
  const username = backendDoc.owner?.name || backendDoc.owner?.email || '-';
  return {
    id: backendDoc.id,
    name: backendDoc.displayName || backendDoc.name || '-',
    description: backendDoc.displayName || '',
    username,
    groups: [],
  };
}
