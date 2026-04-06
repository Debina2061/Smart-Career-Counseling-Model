// Barrel file — re-exports every API module so existing imports keep working
// e.g. import { authAPI, resumeAPI } from '../utils/api'

export { api, setAuthToken, removeAuthToken, isAuthenticated } from './client';
export { authAPI } from './auth';
export { resumeAPI } from './resume';
export { userAPI } from './user';
export { chatbotAPI } from './chatbot';
export { careerAPI } from './career';
export { jobAPI } from './job';
export { adminAPI } from './admin';

// Default export for convenience
import { authAPI } from './auth';
import { resumeAPI } from './resume';
import { userAPI } from './user';
import { chatbotAPI } from './chatbot';
import { careerAPI } from './career';
import { jobAPI } from './job';
import { adminAPI } from './admin';

export default {
  auth: authAPI,
  resume: resumeAPI,
  user: userAPI,
  chatbot: chatbotAPI,
  career: careerAPI,
  job: jobAPI,
  admin: adminAPI,
};
