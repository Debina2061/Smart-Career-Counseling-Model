import React, { useState, useEffect, useRef } from 'react'
import { FaRobot, FaPaperPlane, FaPlus, FaTrash, FaComments, FaHistory } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import StudentProfileDropdown from '../components/StudentProfileDropdown'
import { chatbotAPI } from '../utils/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function AIChatbot() {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
  });

  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.fullName || user.name || user.email?.split('@')[0] || 'User',
        avatar: user.avatarUrl || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'User'}`
      });
    }
  }, [user]);

  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Session state
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [showSessions, setShowSessions] = useState(false)

  // Load sessions on mount
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await chatbotAPI.getSessions();
      const loadedSessions = response?.data || [];
      setSessions(loadedSessions);

      // Auto-load the most recent session if available
      if (loadedSessions.length > 0) {
        await loadSession(loadedSessions[0]._id);
      } else {
        // No sessions, show welcome message
        setMessages([{
          id: 'welcome',
          sender: 'bot',
          text: 'Hello! 👋 I\'m your AI Career Assistant. I\'m here to help you with career-related questions, resume tips, skill development, and more. How can I assist you today?',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setMessages([{
        id: 'welcome',
        sender: 'bot',
        text: 'Hello! 👋 I\'m your AI Career Assistant. How can I assist you today?',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const response = await chatbotAPI.getSession(sessionId);
      const session = response?.data || response;
      setCurrentSessionId(session._id);
      const sessionMessages = (session.messages || []).map((msg, i) => ({
        id: `${session._id}-${i}`,
        sender: msg.role === 'user' ? 'user' : 'bot',
        text: msg.content,
        timestamp: msg.timestamp
          ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : ''
      }));
      setMessages(sessionMessages);
      setShowSessions(false);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const startNewSession = async () => {
    try {
      const response = await chatbotAPI.startSession();
      const session = response?.data || response;
      setCurrentSessionId(session.sessionId);
      const sessionMessages = (session.messages || []).map((msg, i) => ({
        id: `${session.sessionId}-${i}`,
        sender: msg.role === 'user' ? 'user' : 'bot',
        text: msg.content,
        timestamp: msg.timestamp
          ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(sessionMessages);
      setShowSessions(false);
      // Refresh session list
      loadSessions();
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await chatbotAPI.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([{
          id: 'welcome',
          sender: 'bot',
          text: 'Hello! 👋 Start a new conversation or pick one from your history.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const msgText = inputValue.trim();

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: msgText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let sessionId = currentSessionId;

      // Auto-create a session if none exists
      if (!sessionId) {
        const sessionRes = await chatbotAPI.startSession();
        const session = sessionRes?.data || sessionRes;
        sessionId = session.sessionId;
        setCurrentSessionId(sessionId);
      }

      // Send message through session (persisted in DB)
      const response = await chatbotAPI.sendMessage(sessionId, msgText);
      const data = response?.data || response;

      const botMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data?.aiResponse?.content || data?.answer || 'I apologize, but I could not process your request. Please try again.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);

      // Refresh session list to update titles/timestamps
      const sessionsRes = await chatbotAPI.getSessions();
      setSessions(sessionsRes?.data || []);
    } catch (error) {
      const errorMessage = {
        id: `error-${Date.now()}`,
        sender: 'bot',
        text: `I'm sorry, I encountered an error: ${error.message || 'Please try again later.'}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 ml-52 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <FaRobot className="text-lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">AI Chatbot</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSessions(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <FaHistory className="text-sm" />
              <span>History ({sessions.length})</span>
            </button>
            <button
              onClick={startNewSession}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              <FaPlus className="text-sm" />
              <span>New Chat</span>
            </button>
            <StudentProfileDropdown
              name={userProfile.name}
              email={user?.email || 'student@demo.com'}
              avatar={userProfile.avatar}
              className="border-l border-gray-200 pl-4"
            />
          </div>
        </header>

        {/* CHAT CONTENT */}
        <div className="flex-1 overflow-hidden bg-gray-50 flex">
          {/* Session History Sidebar */}
          {showSessions && (
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Chat History</h3>
                <button onClick={() => setShowSessions(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sessionsLoading ? (
                  <div className="p-4 text-sm text-gray-500">Loading conversations...</div>
                ) : sessions.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No conversations yet. Start a new chat!</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {sessions.map((session) => (
                      <div
                        key={session._id}
                        onClick={() => loadSession(session._id)}
                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition group ${currentSessionId === session._id ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{session.title || 'New Conversation'}</p>
                            <p className="text-xs text-gray-500 truncate mt-1">{session.lastMessage || 'No messages yet'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">{session.messageCount || 0} messages</span>
                              <span className="text-xs text-gray-400">{session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : ''}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => deleteSession(session._id, e)}
                            className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                            title="Delete conversation"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
          <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-md ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      message.sender === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-purple-600 text-white'
                    }`}>
                      {message.sender === 'user' ? (
                        <span className="text-sm">S</span>
                      ) : (
                        <FaRobot className="text-sm" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div>
                      <div className={`rounded-lg p-4 ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                      }`}>
                        {message.sender === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap wrap-break-word">{message.text}</p>
                        ) : (
                          <div className="text-sm prose prose-sm max-w-none markdown-content">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                // Custom styling for code blocks
                                code: ({node, inline, className, children, ...props}) => {
                                  return inline ? (
                                    <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                      {children}
                                    </code>
                                  ) : (
                                    <code className="block bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs font-mono my-2" {...props}>
                                      {children}
                                    </code>
                                  )
                                },
                                // Custom styling for lists
                                ul: ({node, ...props}) => (
                                  <ul className="list-disc list-inside space-y-1 my-2" {...props} />
                                ),
                                ol: ({node, ...props}) => (
                                  <ol className="list-decimal list-inside space-y-1 my-2" {...props} />
                                ),
                                // Custom styling for links
                                a: ({node, ...props}) => (
                                  <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                                ),
                                // Custom styling for headings
                                h1: ({node, ...props}) => (
                                  <h1 className="text-xl font-bold mt-3 mb-2" {...props} />
                                ),
                                h2: ({node, ...props}) => (
                                  <h2 className="text-lg font-bold mt-3 mb-2" {...props} />
                                ),
                                h3: ({node, ...props}) => (
                                  <h3 className="text-base font-bold mt-2 mb-1" {...props} />
                                ),
                                // Custom styling for paragraphs
                                p: ({node, ...props}) => (
                                  <p className="my-2 leading-relaxed" {...props} />
                                ),
                                // Custom styling for blockquotes
                                blockquote: ({node, ...props}) => (
                                  <blockquote className="border-l-4 border-gray-300 pl-3 italic my-2" {...props} />
                                ),
                                // Custom styling for tables
                                table: ({node, ...props}) => (
                                  <div className="overflow-x-auto my-2">
                                    <table className="min-w-full divide-y divide-gray-200 border" {...props} />
                                  </div>
                                ),
                                th: ({node, ...props}) => (
                                  <th className="px-3 py-2 bg-gray-50 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border" {...props} />
                                ),
                                td: ({node, ...props}) => (
                                  <td className="px-3 py-2 text-sm border" {...props} />
                                ),
                                // Strong/bold text
                                strong: ({node, ...props}) => (
                                  <strong className="font-bold" {...props} />
                                ),
                                // Emphasis/italic text
                                em: ({node, ...props}) => (
                                  <em className="italic" {...props} />
                                ),
                              }}
                            >
                              {message.text}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      <span className={`text-xs mt-2 block ${message.sender === 'user' ? 'text-right' : 'text-left'} text-gray-500`}>
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <FaRobot className="text-sm" />
                    </div>
                    <div className="bg-white text-gray-900 border border-gray-200 rounded-lg rounded-bl-none p-4">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about career, skills, resume tips..." 
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-black"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-black font-semibold rounded-lg transition flex items-center gap-2"
                  >
                    <FaPaperPlane className="text-lg" />
                    <span>Send</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  💡 Tip: Ask me about career paths, skill development, resume optimization, or interview preparation!
                </p>
              </div>
            </div>
          </div>
          </div>        </div>
      </div>
    </div>
  )
}

export default AIChatbot