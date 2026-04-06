// Admin API endpoints
import api from './client';

export const adminAPI = {
  // Dashboard and analytics
  getDashboardStats: () => api.get('/admin/dashboard'),
  getAdminMe: () => api.get('/admin/me'),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),

  // User management
  getAllUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  updateUser: (userId, userData) => api.patch(`/admin/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

  // Admin management (super admin only)
  getAllAdmins: () => api.get('/admin/admins'),
  createAdmin: (adminData) => api.post('/admin/admins', adminData),
  updateAdmin: (adminId, adminData) => api.patch(`/admin/admins/${adminId}`, adminData),
  removeAdmin: (adminId) => api.delete(`/admin/admins/${adminId}`),

  // System logs
  getSystemLogs: (params) => api.get('/admin/logs', { params }),
};
