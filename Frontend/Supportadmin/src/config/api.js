// ชี้ไปที่ backend ของ bb (เดียวกับ Frontend/User)
function getBaseURL() {
  const base =
    process.env.REACT_APP_API_BASE_URL ||
    (typeof window !== 'undefined' && window.location?.origin) ||
    '';
  return base ? `${String(base).replace(/\/+$/, '')}/api` : '/api';
}

const API_CONFIG = {
  get baseURL() {
    return getBaseURL();
  },
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10),
};

export default API_CONFIG;
