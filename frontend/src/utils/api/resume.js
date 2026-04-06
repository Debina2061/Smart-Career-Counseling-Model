// Resume / ATS Scanner API endpoints
import api from './client';

export const resumeAPI = {
  // Upload and scan resume
  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('resume', file);

    return api.post('/user/upload_resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getResume: () => api.get('/user/resume'),

  // Calculate weighted ATS score
  calculateATSScore: (data) => api.post('/user/ats-score', data),

  // Score resume for specific job
  scoreResumeForJob: (jobDescription, requiredSkills = []) =>
    api.post('/user/ats-score/job', { jobDescription, requiredSkills }),

  // Scan History Management
  saveScanToHistory: (scanData) => api.post('/user/scan-history', scanData),

  getScanHistory: (page = 1, limit = 50) =>
    api.get(`/user/scan-history?page=${page}&limit=${limit}`),

  getScanById: (scanId) => api.get(`/user/scan-history/${scanId}`),

  deleteScan: (scanId) => api.delete(`/user/scan-history/${scanId}`),

  clearScanHistory: () => api.delete('/user/scan-history'),
};
