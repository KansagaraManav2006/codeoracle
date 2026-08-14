function format(amount, currency) {
  var code = currency || 'USD';
  var symbols = { USD: '$', EUR: '€', INR: '₹' };
  return (symbols[code] || code + ' ') + Number(amount || 0).toFixed(2);
}

function parse(value) {
  return Number(String(value).replace(/[^0-9.-]/g, ''));
}

module.exports = { format: format, parse: parse };
