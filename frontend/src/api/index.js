const BASE_URL = '/api';

async function request(method, path, body) {
  const options = {
    method,
    credentials: 'include',          // send HttpOnly session cookie
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res  = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status  = res.status;
    err.code    = data.code;
    err.details = data.details;
    throw err;
  }
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (data) => request('POST', '/auth/login', data),
  logout:         ()     => request('POST', '/auth/logout'),
  me:             ()     => request('GET',  '/auth/me'),
  getEmployees:   ()     => request('GET',  '/auth/employees'),
  createEmployee: (data) => request('POST', '/auth/employees', data),
  updateEmployee: (id, data) => request('PATCH', `/auth/employees/${id}`, data),
  deleteEmployee: (id)   => request('DELETE', `/auth/employees/${id}`),
  setup:          (data) => request('POST', '/auth/setup', data),
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const api = {
  getCustomers:       (q = '') => request('GET', `/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createCustomer:     (data)   => request('POST', '/customers', data),
  getCustomer:        (id)     => request('GET', `/customers/${id}`),
  updateCustomer:     (id, data) => request('PUT', `/customers/${id}`, data),
  getCustomerPurchases: (id)   => request('GET', `/customers/${id}/purchases`),
  getCustomerLedger:  (id)     => request('GET', `/customers/${id}/ledger`),
  getCustomerOffers:  (id)     => request('GET', `/customers/${id}/offers`),

  getPurchases: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/purchases${qs ? `?${qs}` : ''}`);
  },
  getPurchase:    (id)   => request('GET', `/purchases/${id}`),
  createPurchase: (data) => request('POST', '/purchases', data),

  getRewardRules:   ()     => request('GET',  '/rewards/rules'),
  createRewardRule: (data) => request('POST', '/rewards/rules', data),
  calculateReward:  (amount, pts) =>
    request('GET', `/rewards/calculate?amount=${amount}${pts ? `&pointsToRedeem=${pts}` : ''}`),
  redeemPoints: (data) => request('POST', '/rewards/redeem', data),

  getDashboardStats:      () => request('GET', '/dashboard/stats'),
  getRecentTransactions:  () => request('GET', '/dashboard/recent-transactions'),
  getSalesTrend:          () => request('GET', '/dashboard/sales-trend'),
  getRedemptionTrend:     () => request('GET', '/dashboard/redemption-trend'),

  getOffers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/offers${qs ? `?${qs}` : ''}`);
  },
  generateOffers: (customerId) => request('POST', `/offers/generate/${customerId}`),

  getTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/transactions${qs ? `?${qs}` : ''}`);
  },
};

// ─── Formatters ───────────────────────────────────────────────────────────────
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatPoints(points) {
  return (points || 0).toLocaleString('en-IN');
}
