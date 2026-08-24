const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
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
};
