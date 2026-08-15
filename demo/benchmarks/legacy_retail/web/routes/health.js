function handle(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: 'ok', service: 'legacy-retail-web' }));
}

module.exports = { handle: handle };
