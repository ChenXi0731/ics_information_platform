import axios from 'axios';

// 建立 Axios 實體
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 設定請求攔截器 (Request Interceptor)
// 這樣未來你發送任何請求時，如果瀏覽器裡有 Token，它會自動幫你帶上！
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('ics_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;