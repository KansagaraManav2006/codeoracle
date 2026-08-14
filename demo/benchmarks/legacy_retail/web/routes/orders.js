var api = require('../services/api_client');
var session = require('../services/session_store');
var currency = require('../utils/currency');

function handle(req, res) {
  var userId = session.userFromRequest(req);
  api.fetchOrders(userId, function (error, orders) {
    if (error) {
      res.statusCode = 502;
      return res.end('Order service unavailable');
    }
    var payload = orders.map(function (order) {
      return { id: order.id, status: order.status, total: currency.format(order.total) };
    });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  });
}

module.exports = { handle: handle };
