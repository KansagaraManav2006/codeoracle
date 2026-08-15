var cache = require('./session_store');

function fetchOrders(userId, callback) {
  var existing = cache.get('orders:' + userId);
  if (existing) return callback(null, existing);
  var orders = [{ id: 'ORD-' + userId + '-1', status: 'paid', total: 52.92 }];
  cache.set('orders:' + userId, orders);
  callback(null, orders);
}

function normalizeResponse(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

module.exports = { fetchOrders: fetchOrders, normalizeResponse: normalizeResponse };
