import React, { createContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

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
          localStorage.setItem('user', JSON.stringify(res.user));
        }
      } catch (err) {
        setUser(null);
        setUserRole(null);
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const login = async (email, password) => {
    setError('');
    try {
      const data = await authApi.loginLocal(email, password);
      setUser(data.user);
      setUserRole(data.user.role);
      return data.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const signup = async (name, email, password, confirmPassword, role) => {
    setError('');
    try {
      const data = await authApi.signupLocal(name, email, password, confirmPassword, role);
      setUser(data.user);
      setUserRole(data.user.role);
      return data.user;
    } catch (err) {
      setError(err.message || 'Signup failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout failed on backend:', e);
    }
    localStorage.removeItem('user');
    setUser(null);
    setUserRole(null);
    setError('');
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, error, setError, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
