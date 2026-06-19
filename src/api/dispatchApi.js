import { request } from './client';

export const dispatchApi = {
  getVehicles: () => request('/vehicles'),
  createVehicle: body => request('/vehicles', { method: 'POST', body: JSON.stringify(body) }),
  
  getDispatches: () => request('/dispatch'),
  createDispatch: body => request('/dispatch', { method: 'POST', body: JSON.stringify(body) }),
  startDispatch: id => request(`/dispatch/${id}/start`, { method: 'PATCH' }),
  completeDispatch: (id, body) => request(`/dispatch/${id}/resolve`, { method: 'PATCH', body: JSON.stringify(body) })
};
