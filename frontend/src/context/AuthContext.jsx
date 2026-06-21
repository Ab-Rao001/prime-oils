import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { queryClient } from '../App';
import { useNotificationStore } from '../store/notificationStore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authApi.getMe();
        if (res.success && res.user) {
          setUser(res.user);
          setUserRole(res.user.role);
          sessionStorage.setItem('user', JSON.stringify(res.user));
        }
      } catch (err) {
        setUser(null);
        setUserRole(null);
        sessionStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

    const handleForceLogout = () => {
      sessionStorage.removeItem('user');
      setUser(null);
      setUserRole(null);
      setError('Session expired. Please log in again.');
      queryClient.clear(); // Clear cached data on forced logout
      useNotificationStore.getState().clearNotifications();
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  // Inactivity Auto-Logout (5 minutes)
  useEffect(() => {
    let inactivityTimer;
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      if (user) {
        inactivityTimer = setTimeout(() => {
          logout();
          setError('You have been securely logged out due to 5 minutes of inactivity.');
        }, 5 * 60 * 1000); // 5 minutes
      }
    };

    if (user) {
      resetTimer();
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      
      // Throttle mousemove slightly for performance by only attaching to document body
      events.forEach(evt => document.addEventListener(evt, resetTimer, { passive: true }));

      return () => {
        clearTimeout(inactivityTimer);
        events.forEach(evt => document.removeEventListener(evt, resetTimer, { passive: true }));
      };
    }
  }, [user, logout]);

  const login = useCallback(async (email, password) => {
    setError('');
    try {
      queryClient.clear(); // Clear any stale cache from previous sessions
      useNotificationStore.getState().clearNotifications();
      const data = await authApi.loginLocal(email, password);
      setUser(data.user);
      setUserRole(data.user.role);
      return data.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  const signup = useCallback(async (name, email, password, confirmPassword, role) => {
    setError('');
    try {
      queryClient.clear(); // Clear any stale cache from previous sessions
      useNotificationStore.getState().clearNotifications();
      const data = await authApi.signupLocal(name, email, password, confirmPassword, role);
      setUser(data.user);
      setUserRole(data.user.role);
      return data.user;
    } catch (err) {
      setError(err.message || 'Signup failed');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout failed on backend:', e);
    }
    sessionStorage.removeItem('user');
    setUser(null);
    setUserRole(null);
    setError('');
    queryClient.clear(); // Clear all cached data!
    useNotificationStore.getState().clearNotifications();
  }, []);

  const value = useMemo(() => ({
    user,
    userRole,
    loading,
    error,
    setError,
    isAuthenticated: !!user,
    login,
    signup,
    logout
  }), [user, userRole, loading, error, login, signup, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
