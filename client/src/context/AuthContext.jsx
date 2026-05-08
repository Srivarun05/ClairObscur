import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Api from '../Api'; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Centralized logout keeps React state and localStorage in sync everywhere in the app.
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  useEffect(() => {
    // A global 401 handler prevents every page from needing to duplicate session-expired logic.
    const interceptor = Api.interceptors.response.use(
      (response) => response, 
      (error) => {
        const requestUrl = error.config?.url || '';
        const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

        if (error.response && error.response.status === 401 && !isAuthRequest) {
          logout();
          window.location.href = '/login?session=expired'; 
        }
        return Promise.reject(error);
      }
    );

    return () => {
      Api.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  const refreshUserProfile = useCallback(async (authToken) => {
    try {
      // The latest profile is fetched from the database so local edits stay fresh after login.
      if (Api.defaults.headers) {
          Api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await Api.get('/users/profile');
      const updatedUser = response.data.data;
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Failed to sync profile from DB:", error);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      try {
        // We decode the JWT locally to avoid booting the app with an obviously expired session.
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        
        if (isExpired) {
          logout();
          setLoading(false);
          return; 
        }
      } catch (e) {
        console.error("Failed to parse token", e);
      }

      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      
      refreshUserProfile(storedToken);
    }
    setLoading(false);
  }, [refreshUserProfile, logout]);

  const login = (userData, authToken = null) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));

    if (authToken) {
      // Persisting the token here allows refreshes and new tabs to restore the session.
      setToken(authToken);
      localStorage.setItem('token', authToken);
      refreshUserProfile(authToken);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUserProfile, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
