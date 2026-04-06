// Career Recommendation API endpoints
import api from './client';

export const careerAPI = {
  // Generate career recommendations
  generateRecommendations: (data) => api.post('/recommendation/generate', data || {}),

  // Get user's recommendations
  getRecommendations: () => api.get('/recommendation'),

  // Compare with a career
  compareWithCareer: (careerId) => api.post(`/recommendation/compare/${careerId}`),

  // Search for careers with custom parameters (auto-search)
  searchCareers: (searchParams) => api.post('/recommendation/search', searchParams),

  // Get all careers (public)
  getAllCareers: (params) => api.get('/recommendation/careers', { params }),

  // Get career details (public)
  getCareerDetails: (careerId) => api.get(`/recommendation/careers/${careerId}`),

  // Admin: create/update/delete careers
  createCareer: (careerData) => api.post('/recommendation/careers', careerData),
  updateCareer: (careerId, careerData) => api.patch(`/recommendation/careers/${careerId}`, careerData),
  deleteCareer: (careerId) => api.delete(`/recommendation/careers/${careerId}`),
};
