// Job API endpoints
import api from './client';

export const jobAPI = {
  // Get all jobs (public)
  getAllJobs: () => api.get('/job'),

  // Get job by ID
  getJobById: (jobId) => api.get(`/job/${jobId}`),

  // Get job matches for user
  getMatches: () => api.get('/job/user/matches'),

  // Analyze job match
  analyzeMatch: (jobId) => api.get(`/job/${jobId}/analyze`),

  // Apply for job
  applyForJob: (jobId) => api.post(`/job/${jobId}/apply`),

  // Get user's applications
  getMyApplications: () => api.get('/job/user/applications'),

  // Create job (admin/employer)
  createJob: (jobData) => api.post('/job/create', jobData),
};
