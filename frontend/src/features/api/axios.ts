import axios, { type AxiosRequestHeaders } from 'axios';

// 환경에 따라 API URL 설정
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) return 'https://tmsv2-production.up.railway.app/api';
  return 'http://localhost:3001/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // 쿠키 기반 인증
});

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  if (!isSafe) {
    const csrf = getCookie('csrf_token');
    if (csrf) {
      const headers = (config.headers ?? {}) as AxiosRequestHeaders;
      headers['X-CSRF-Token'] = csrf;
      config.headers = headers;
    }
  }
  return config;
});

// 응답 인터셉터: 401이면 세션 정리 후 로그인 페이지로 이동
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
