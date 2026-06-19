export const API_BASE = process.env.REACT_APP_API_URL || '/api';
const REQUEST_TIMEOUT_MS = 8000;

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed() {
  refreshSubscribers.forEach(cb => cb());
  refreshSubscribers = [];
}

export function buildUrl(path, params) {
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

export async function request(path, options = {}, retries = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = {};
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, {
      headers,
      signal: controller.signal,
      credentials: 'include',
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
      let errorMsg = data.message || res.statusText || 'Request failed';
      if (data.error) {
        if (typeof data.error === 'string') {
          errorMsg = data.error;
        } else if (data.error.message) {
          errorMsg = data.error.message;
        }
      }
      throw new Error(errorMsg);
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

export function uploadWithProgress(method, path, formData, onProgress) {
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
