import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
console.log('API URL:', API_URL); // Debug log

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies/sessions
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data: { name: string; email: string; password: string; passwordConfirm: string }) =>
    api.post('/auth/signup', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  logout: () => api.get('/auth/logout'),
  
  getMe: () => api.get('/auth/me'),
  
  updateMe: (data: { name?: string; email?: string; company?: string; phone?: string; address?: string }) =>
    api.patch('/auth/updateMe', data),
};

// User API
export const userAPI = {
  // Add other user-related API calls here
  // Example:
  // getUser: (id: string) => api.get(`/users/${id}`),
};

export default api;
