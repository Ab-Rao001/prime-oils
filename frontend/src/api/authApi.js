import { request, API_BASE } from './client';

export const authApi = {
  getMe: () => request('/auth/me'),
  logout: () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    return request('/auth/logout', { method: 'POST' });
  },
  
  loginLocal: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || data.message || 'Login failed');
    if (data.user) {
      sessionStorage.setItem('user', JSON.stringify(data.user));
      if (data.accessToken) sessionStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) sessionStorage.setItem('refreshToken', data.refreshToken);
    }
    return data;
  },

  signupLocal: async (name, email, password, confirmPassword, role) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, confirmPassword, role }),
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || data.message || 'Signup failed');
    if (data.user) {
      sessionStorage.setItem('user', JSON.stringify(data.user));
      if (data.accessToken) sessionStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) sessionStorage.setItem('refreshToken', data.refreshToken);
    }
    return data;
  },

  loginWithFirebaseIdToken: async (idToken) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || data.message || 'API login failed');
    return data;
  }
};
