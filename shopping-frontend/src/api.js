const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Voice / text command -> published to Kafka, applied asynchronously
  sendCommand: (userId, text) =>
    request('/api/commands', { method: 'POST', body: JSON.stringify({ userId, text }) }),

  // Shopping list
  getShoppingList: (userId) => request(`/api/shopping?userId=${encodeURIComponent(userId)}`),
  addShoppingItem: (userId, name, quantity = 1, unit = null) =>
    request('/api/shopping', { method: 'POST', body: JSON.stringify({ userId, name, quantity, unit }) }),
  updateShoppingItem: (id, patch) =>
    request(`/api/shopping/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteShoppingItem: (id) => request(`/api/shopping/${id}`, { method: 'DELETE' }),

  // Products
  searchProducts: (query) => request(`/api/products/search?${query}`),

  // Recommendations
  getRecommendations: (userId) => request(`/api/recommendations?userId=${encodeURIComponent(userId)}`),
};

// A stable per-browser demo identity, since the backend has no auth layer yet.
export function getOrCreateUserId() {
  const key = 'listy:userId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `guest-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, id);
  }
  return id;
}
