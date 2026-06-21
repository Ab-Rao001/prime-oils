import { request, buildUrl, uploadWithProgress } from './client';

export const inventoryApi = {
  getProducts: params => request(buildUrl('/products', params)),
  createProduct: body => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adjustStock: (id, delta) => request(`/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ delta }) }),
  receiveProduct: (body) => request(`/products/receive`, { method: 'POST', body: JSON.stringify(body) }),
  
  uploadProductImage: (id, file, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    return uploadWithProgress('POST', `/products/${id}/image`, formData, onProgress);
  },
  deleteProductImage: id => request(`/products/${id}/image`, { method: 'DELETE' }),

  getPurchaseOrders: params => request(buildUrl('/purchaseOrders', params)),
  createPurchaseOrder: body => request('/purchaseOrders', { method: 'POST', body: JSON.stringify(body) }),
  receivePurchaseOrder: id => request(`/purchaseOrders/${id}/receive`, { method: 'PATCH' }),
  updatePurchaseOrder: (id, body) => request(`/purchaseOrders/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
};
