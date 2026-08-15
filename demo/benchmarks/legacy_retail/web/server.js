var http = require('node:http');
var orders = require('./routes/orders');
var health = require('./routes/health');

function routeRequest(req, res) {
  if (req.url === '/health') return health.handle(req, res);
  if (req.url.indexOf('/orders') === 0) return orders.handle(req, res);
  res.statusCode = 404;
  res.end('Not found');
}

function start(port, callback) {
  var server = http.createServer(routeRequest);
  return server.listen(port || 3000, callback);
}

module.exports = { start: start, routeRequest: routeRequest };

if (require.main === module) start(process.env.PORT || 3000);
