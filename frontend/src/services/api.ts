import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bgmiq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bgmiq_token');
      localStorage.removeItem('bgmiq_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) => api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me'),
};

// Readings
export const readingsApi = {
  list: (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    api.get('/readings', { params }),
  get: (id: number) => api.get(`/readings/${id}`),
  create: (data: Record<string, unknown>) => api.post('/readings', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/readings/${id}`, data),
  delete: (id: number) => api.delete(`/readings/${id}`),
  deleteAll: () => api.delete('/readings'),
  import: (file: File) => {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('timezoneOffset', String(new Date().getTimezoneOffset()));
    return api.post('/readings/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Dashboard
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

// Analysis
export const analysisApi = {
  get: (days: number = 30) => api.get('/analysis', { params: { days } }),
};

// Reports
export const reportsApi = {
  doctorReport: (params: { startDate?: string; endDate?: string }) =>
    api.get('/reports/doctor-report', { params }),
};

// Profile
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data: Record<string, unknown>) => api.put('/profile', data),
};

// Alerts
export const alertsApi = {
  list: (params?: { limit?: number; unread?: boolean }) => api.get('/alerts', { params }),
  markRead: (id: number) => api.put(`/alerts/${id}/read`),
  markAllRead: () => api.put('/alerts/read-all'),
};

export default api;