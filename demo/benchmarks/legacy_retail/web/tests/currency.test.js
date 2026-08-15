var currency = require('../utils/currency');

function testCurrencyFormatting() {
  if (currency.format(12.5) !== '$12.50') throw new Error('Currency formatting changed');
  return true;
}

function testCurrencyParsing() {
  if (currency.parse('$12.50') !== 12.5) throw new Error('Currency parsing changed');
  return true;
}

module.exports = { testCurrencyFormatting: testCurrencyFormatting, testCurrencyParsing: testCurrencyParsing };
