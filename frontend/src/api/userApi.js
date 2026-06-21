import { request, buildUrl, uploadWithProgress } from './client';

export const userApi = {
  getShopkeepers: params => request(buildUrl('/shopkeepers', params)),
  createShopkeeper: body => request('/shopkeepers', { method: 'POST', body: JSON.stringify(body) }),
  updateShopkeeper: (id, body) => request(`/shopkeepers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteShopkeeper: id => request(`/shopkeepers/${id}`, { method: 'DELETE' }),

  getComplaints: params => request(buildUrl('/complaints', params)),
  createComplaint: body => request('/complaints', { method: 'POST', body: JSON.stringify(body) }),
  updateComplaint: (id, body) => request(`/complaints/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getNotifications: params => request(buildUrl('/notifications', params)),
  createNotification: body => request('/notifications', { method: 'POST', body: JSON.stringify(body) }),
  markNotificationRead: id => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'POST' }),

  getCampaigns: params => request(buildUrl('/campaigns', params)),
  createCampaign: body => request('/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  deleteCampaign: id => request(`/campaigns/${id}`, { method: 'DELETE' }),
  logCampaignSpend: (id, payload) => request(`/campaigns/${id}/spend`, { method: 'POST', body: JSON.stringify(payload) }),

  getUsers: async () => {
    const res = await request('/users');
    return res.data;
  },
  getSalesmen: async () => {
    const res = await request('/users/salesmen');
    return res.data;
  },
  updateProfile: body => request('/users/profile', { method: 'PUT', body: JSON.stringify(body) }),
  uploadProfileAvatar: (file, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    return uploadWithProgress('POST', '/users/profile/avatar', formData, onProgress);
  },
  createUser: body => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUserRole: (id, role) => request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  disableUser: id => request(`/users/${id}`, { method: 'DELETE' }),
  resetUserPassword: id => request(`/users/${id}/reset-password`, { method: 'POST' })
};
