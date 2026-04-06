import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setAuthToken, removeAuthToken } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // This works for both Authorization header token and HttpOnly cookie session.
        const profile = await authAPI.getProfile();
        setUser(profile.user || profile);
        setIsAuthenticated(true);
      } catch (error) {
        removeAuthToken();
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.signIn(credentials);
      // Handle both 'token' and 'jwtToken' for backwards compatibility
      const token = response.token || response.jwtToken;
      if (token) {
        setAuthToken(token);
        let userPayload = response.user || response;
        if (!userPayload?.Role) {
          try {
            const profile = await authAPI.getProfile();
            userPayload = profile.user || profile;
          } catch {
            // If profile fetch fails, keep login response
          }
        }
        setUser(userPayload);
        setIsAuthenticated(true);
        return response;
      } else {
        throw new Error('No token received from login');
      }
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.signUp(userData);
      // Signup no longer returns a token — user must verify OTP first
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.signOut();
    } catch {
      // Ignore sign-out API failures and still clear client state.
    }
    removeAuthToken();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/signin';
  };

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
