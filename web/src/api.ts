import axios from 'axios';
import { message } from 'antd';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || '请求失败';
    const text = Array.isArray(msg) ? msg.join('；') : msg;
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (!location.pathname.startsWith('/login')) {
        message.warning('请重新登录');
        setTimeout(() => (location.href = '/login'), 300);
      }
    }
    message.error(text);
    return Promise.reject(new Error(text));
  },
);

export default api;
