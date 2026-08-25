const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

/** Resolve relative /uploads/... paths against the API host; leave absolute URLs as-is. */
export function mediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  googleAuth: (body) => request('/auth/google', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },
  getCategories: () => request('/products/categories'),
  getProduct: (slug) => request(`/products/${slug}`),
  getCart: () => request('/cart'),
  addToCart: (body) => request('/cart/items', { method: 'POST', body: JSON.stringify(body) }),
  updateCartItem: (id, body) =>
    request(`/cart/items/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeCartItem: (id) => request(`/cart/items/${id}`, { method: 'DELETE' }),
  checkout: (body) => request('/orders/checkout', { method: 'POST', body: JSON.stringify(body) }),
  confirmPayment: (orderId, body) =>
    request(`/orders/${orderId}/confirm-payment`, { method: 'POST', body: JSON.stringify(body) }),
  getPaymentConfig: () => request('/payments/config'),
  getOrders: () => request('/orders'),
  chat: (body) => request('/ai/chat', { method: 'POST', body: JSON.stringify(body) }),

  // Profile
  getProfile: () => request('/profile'),
  updateProfile: (body) => request('/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  uploadAvatar: (file) => {
    const body = new FormData();
    body.append('avatar', file);
    return request('/profile/avatar', { method: 'POST', body });
  },
  createAddress: (body) =>
    request('/profile/addresses', { method: 'POST', body: JSON.stringify(body) }),
  updateAddress: (id, body) =>
    request(`/profile/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAddress: (id) => request(`/profile/addresses/${id}`, { method: 'DELETE' }),
  setDefaultAddress: (id) =>
    request(`/profile/addresses/${id}/default`, { method: 'PATCH' }),

  // Admin
  adminStats: () => request('/admin/stats'),
  adminProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/products${qs ? `?${qs}` : ''}`);
  },
  adminProduct: (id) => request(`/admin/products/${id}`),
  adminUploadProductImage: (file) => {
    const body = new FormData();
    body.append('image', file);
    return request('/admin/products/upload-image', { method: 'POST', body });
  },
  adminCreateProduct: (body) =>
    request('/admin/products', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdateProduct: (id, body) =>
    request(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminDeleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
  adminInventory: () => request('/admin/inventory'),
  adminUpdateStock: (variantId, body) =>
    request(`/admin/inventory/${variantId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminCategories: () => request('/admin/categories'),
  adminCreateCategory: (body) =>
    request('/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
  adminOrders: () => request('/admin/orders'),
  adminUpdateOrderStatus: (id, body) =>
    request(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
};
