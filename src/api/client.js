const API_BASE = process.env.REACT_APP_API_URL || '/api';
const REQUEST_TIMEOUT_MS = 8000;

export function setAccessToken(token) {
  // Empty implementation as token is now httpOnly cookie
}

function getAuthHeaders(json = true) {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  // Tokens are sent automatically via httpOnly cookies
  return headers;
}

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed() {
  refreshSubscribers.forEach(cb => cb());
  refreshSubscribers = [];
}

async function request(path, options = {}, retries = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: getAuthHeaders(!(options.body instanceof FormData)),
      signal: controller.signal,
      credentials: 'include', // Important for cookies
      ...options,
    });
    
    // Auto-refresh token on 401
    if (res.status === 401 && !path.includes('/auth/login') && retries > 0) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) 
          });
          const refreshData = await refreshRes.json();
          if (refreshData.success) {
            isRefreshing = false;
            onRefreshed();
            return request(path, options, retries - 1);
          } else {
            isRefreshing = false;
            throw new Error('Session expired. Please log in again.');
          }
        } catch (e) {
          isRefreshing = false;
          throw new Error('Session expired. Please log in again.');
        }
      } else {
        return new Promise(resolve => {
          subscribeTokenRefresh(() => resolve(request(path, options, retries - 1)));
        });
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || res.statusText || 'Request failed');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Server not responding. Start the API: npm run server');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function buildUrl(path, params) {
  if (!params) return path;
  const filtered = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      filtered[key] = val;
    }
  });
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `${path}?${qs}` : path;
}

export async function loginWithFirebaseIdToken(idToken) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'API login failed');
  }
  if (data.accessToken) {
    setAccessToken(data.accessToken);
  }
  return data;
}

export async function loginLocal(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

export async function signupLocal(name, email, password, confirmPassword, role) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, confirmPassword, role }),
    credentials: 'include'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Signup failed');
  }
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

function uploadWithProgress(method, path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_BASE}${path}`);
    xhr.withCredentials = true;

    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        data = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.message || xhr.statusText || 'Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export const api = {
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getProducts: params => request(buildUrl('/products', params)),
  createProduct: body => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adjustStock: (id, delta) =>
    request(`/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ delta }) }),

  uploadProductImage: (id, file, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    return uploadWithProgress('POST', `/products/${id}/image`, formData, onProgress);
  },

  deleteProductImage: id => request(`/products/${id}/image`, { method: 'DELETE' }),

  getOrders: params => request(buildUrl('/orders', params)),
  createOrder: body => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  updateOrder: (orderId, body) => request(`/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getPayments: params => request(buildUrl('/payments', params)),
  updatePayment: (paymentId, body) => request(`/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getShopkeepers: params => request(buildUrl('/shopkeepers', params)),
  createShopkeeper: body => request('/shopkeepers', { method: 'POST', body: JSON.stringify(body) }),
  updateShopkeeper: (id, body) => request(`/shopkeepers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getComplaints: params => request(buildUrl('/complaints', params)),
  createComplaint: body => request('/complaints', { method: 'POST', body: JSON.stringify(body) }),
  updateComplaint: (id, body) => request(`/complaints/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getCampaigns: params => request(buildUrl('/campaigns', params)),
  createCampaign: body => request('/campaigns', { method: 'POST', body: JSON.stringify(body) }),

  getNotifications: params => request(buildUrl('/notifications', params)),
  createNotification: body => request('/notifications', { method: 'POST', body: JSON.stringify(body) }),
  markNotificationRead: id => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'POST' }),

  getChart: key => request(`/charts/${key}`),

  getUsers: async () => {
    const res = await request('/users');
    return res.data;
  },
  createUser: body => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUserRole: (id, role) =>
    request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  disableUser: id => request(`/users/${id}`, { method: 'DELETE' }),
  resetUserPassword: id => request(`/users/${id}/reset-password`, { method: 'POST' }),

  getReportsSummary: params => request(buildUrl('/reports/summary', params)),

  async downloadReportExport({ startDate, endDate, format }) {
    const url = `${API_BASE}${buildUrl('/reports/orders/export', { startDate, endDate, format })}`;
    const token = getAccessToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Export failed');
    }

    const blob = await res.blob();
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    const filename = `prime-oil-report-${startDate || 'all'}-${endDate || 'all'}.${ext}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  },
};

export default api;
