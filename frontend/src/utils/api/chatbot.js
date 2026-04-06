// AI Chatbot API endpoints
import api from './client';

export const chatbotAPI = {
  // Quick ask (stateless)
  quickAsk: (question) => api.post('/chat/ask', { question }),

  // Start a new chat session
  startSession: () => api.post('/chat/session'),

  // Send message to a session
  sendMessage: (sessionId, message) => api.post(`/chat/session/${sessionId}/message`, { message }),

  // Get all sessions
  getSessions: () => api.get('/chat/sessions'),

  // Get specific session
  getSession: (sessionId) => api.get(`/chat/session/${sessionId}`),

  // Delete session
  deleteSession: (sessionId) => api.delete(`/chat/session/${sessionId}`),
};
