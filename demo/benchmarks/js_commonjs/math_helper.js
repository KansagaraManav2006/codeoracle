/**
 * CommonJS Math Helper module for legacy JavaScript benchmark.
 */

function sum(a, b) {
  return (a || 0) + (b || 0);
}

function subtract(a, b) {
  return (a || 0) - (b || 0);
}

function multiply(a, b) {
  return (a || 0) * (b || 0);
}

function divide(a, b) {
  if (!b || b === 0) return 0;
  return a / b;
}

class MetricCalculator {
  constructor(scale = 1) {
    this.scale = scale;
  }

  computeScore(value, weight) {
    if (!value) return 0;
    const w = weight || 1;
    return value * w * this.scale;
  }
}

module.exports = {
  sum,
  subtract,
  multiply,
  divide,
  MetricCalculator,
};
