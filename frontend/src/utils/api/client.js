// Shared Axios instance with interceptors and auth helpers
import axios from 'axios';

// Create axios instance with base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - adds auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`🚀 [${config.method?.toUpperCase()}] ${config.url}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles responses and errors
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`✅ [${response.status}] ${response.config.url}`);
    }
    return response.data;
  },
  (error) => {
    // Log error in development
    if (import.meta.env.DEV) {
      console.error(`❌ [${error.response?.status || 'Network Error'}] ${error.config?.url}`, error.message);
    }

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/signin') && !window.location.pathname.includes('/signup')) {
        window.location.href = '/signin';
      }
    }

    // Format error response
    const errorResponse = {
      status: error.response?.status || 500,
      message: error.response?.data?.message || error.message || 'Something went wrong',
      data: error.response?.data || null,
    };

    return Promise.reject(errorResponse);
  }
);

// Helper function to get auth token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Helper function to set auth token in localStorage
export const setAuthToken = (token) => localStorage.setItem('token', token);

// Helper function to remove auth token from localStorage
export const removeAuthToken = () => localStorage.removeItem('token');

// Helper function to check if user is authenticated
export const isAuthenticated = () => !!getAuthToken();

// Helper to append values to FormData
export const appendFormValue = (formData, key, value) => {
  if (value === undefined || value === null) return;
  if (value instanceof File) {
    formData.append(key, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item !== undefined && item !== null) formData.append(key, item);
    });
    return;
  }
  if (typeof value === 'object') {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, value);
};

export { api };
export default api;
