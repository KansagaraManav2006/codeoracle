const logger = require('./logger');

function startServer(port) {
  logger.log('Starting server on port ' + port);
}

module.exports = {
  startServer: startServer,
};
