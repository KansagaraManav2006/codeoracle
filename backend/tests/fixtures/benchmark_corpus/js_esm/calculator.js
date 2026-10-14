import { add, multiply } from './math_utils.js';

export class Calculator {
  compute(a, b, op) {
    if (op === 'add') {
      return add(a, b);
    }
    return multiply(a, b);
  }
}
