var values = {};

function get(key) {
  return values[key];
}

function set(key, value) {
  values[key] = value;
  return value;
}

function userFromRequest(req) {
  var header = req && req.headers ? req.headers['x-user-id'] : null;
  return header || 'guest';
}

module.exports = { get: get, set: set, userFromRequest: userFromRequest };
