// User API endpoints
import api from './client';

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  getDashboard: () => api.get('/user/dashboard'),
};
