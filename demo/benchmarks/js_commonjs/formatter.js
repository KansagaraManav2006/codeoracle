/**
 * CommonJS Formatter module referencing math_helper.
 */
const math = require('./math_helper');

function formatOperationResult(operation, a, b) {
  let result = 0;
  if (operation === 'add') {
    result = math.sum(a, b);
  } else if (operation === 'subtract') {
    result = math.subtract(a, b);
  } else if (operation === 'multiply') {
    result = math.multiply(a, b);
  } else if (operation === 'divide') {
    result = math.divide(a, b);
  }

  return `[${operation.toUpperCase()}] Result = ${result}`;
}

function truncateString(str, maxLength = 10) {
  var s = str || ''; // var usage for legacy JS warning testing
  if (s.length <= maxLength) return s;
  return s.substring(0, maxLength) + '...';
}

module.exports = {
  formatOperationResult,
  truncateString,
};
