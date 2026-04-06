'use strict';

const {
  isNonEmptyString,
  isPositiveNumber,
  isNonNegativeInteger,
  formatPrice,
  generateId,
  applyDiscount,
  isValidEmail,
  paginate,
} = require('../src/utils');

describe('isNonEmptyString', () => {
  test('returns true for a regular string', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  test('returns true for a string with leading/trailing spaces that is non-empty after trim', () => {
    expect(isNonEmptyString('  hi  ')).toBe(true);
  });

  test('returns false for an empty string', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  test('returns false for a whitespace-only string', () => {
    expect(isNonEmptyString('   ')).toBe(false);
  });

  test('returns false for a number', () => {
    expect(isNonEmptyString(42)).toBe(false);
  });

  test('returns false for null', () => {
    expect(isNonEmptyString(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isNonEmptyString(undefined)).toBe(false);
  });

  test('returns false for an array', () => {
    expect(isNonEmptyString([])).toBe(false);
  });
});

describe('isPositiveNumber', () => {
  test('returns true for a positive integer', () => {
    expect(isPositiveNumber(5)).toBe(true);
  });

  test('returns true for a positive float', () => {
    expect(isPositiveNumber(0.01)).toBe(true);
  });

  test('returns false for zero', () => {
    expect(isPositiveNumber(0)).toBe(false);
  });

  test('returns false for a negative number', () => {
    expect(isPositiveNumber(-1)).toBe(false);
  });

  test('returns false for Infinity', () => {
    expect(isPositiveNumber(Infinity)).toBe(false);
  });

  test('returns false for NaN', () => {
    expect(isPositiveNumber(NaN)).toBe(false);
  });

  test('returns false for a string', () => {
    expect(isPositiveNumber('5')).toBe(false);
  });

  test('returns false for null', () => {
    expect(isPositiveNumber(null)).toBe(false);
  });
});

describe('isNonNegativeInteger', () => {
  test('returns true for zero', () => {
    expect(isNonNegativeInteger(0)).toBe(true);
  });

  test('returns true for a positive integer', () => {
    expect(isNonNegativeInteger(10)).toBe(true);
  });

  test('returns false for a negative integer', () => {
    expect(isNonNegativeInteger(-1)).toBe(false);
  });

  test('returns false for a float', () => {
    expect(isNonNegativeInteger(1.5)).toBe(false);
  });

  test('returns false for a string', () => {
    expect(isNonNegativeInteger('3')).toBe(false);
  });

  test('returns false for NaN', () => {
    expect(isNonNegativeInteger(NaN)).toBe(false);
  });
});

describe('formatPrice', () => {
  test('formats an integer amount', () => {
    expect(formatPrice(10)).toBe('10.00');
  });

  test('formats a float to two decimals', () => {
    expect(formatPrice(9.9)).toBe('9.90');
  });

  test('formats a value that already has two decimals', () => {
    expect(formatPrice(3.14)).toBe('3.14');
  });

  test('formats zero', () => {
    expect(formatPrice(0)).toBe('0.00');
  });

  test('throws for a negative number', () => {
    expect(() => formatPrice(-1)).toThrow('Invalid amount');
  });

  test('throws for a string', () => {
    expect(() => formatPrice('10')).toThrow('Invalid amount');
  });

  test('throws for NaN', () => {
    expect(() => formatPrice(NaN)).toThrow('Invalid amount');
  });
});

describe('generateId', () => {
  test('generates an ID with correct format', () => {
    expect(generateId('prd', 1)).toBe('PRD-000001');
  });

  test('pads the sequence to 6 digits', () => {
    expect(generateId('ord', 42)).toBe('ORD-000042');
  });

  test('uppercases the prefix', () => {
    expect(generateId('usr', 100)).toBe('USR-000100');
  });

  test('throws for an empty string prefix', () => {
    expect(() => generateId('', 1)).toThrow('prefix must be a non-empty string');
  });

  test('throws for a non-string prefix', () => {
    expect(() => generateId(123, 1)).toThrow('prefix must be a non-empty string');
  });

  test('throws for sequence = 0', () => {
    expect(() => generateId('X', 0)).toThrow('sequence must be a positive integer');
  });

  test('throws for a float sequence', () => {
    expect(() => generateId('X', 1.5)).toThrow('sequence must be a positive integer');
  });

  test('throws for a negative sequence', () => {
    expect(() => generateId('X', -1)).toThrow('sequence must be a positive integer');
  });
});

describe('applyDiscount', () => {
  test('applies a 10% discount', () => {
    expect(applyDiscount(100, 10)).toBe(90);
  });

  test('applies a 50% discount', () => {
    expect(applyDiscount(200, 50)).toBe(100);
  });

  test('applies a 0% discount (no change)', () => {
    expect(applyDiscount(99.99, 0)).toBe(99.99);
  });

  test('applies a 100% discount (free)', () => {
    expect(applyDiscount(50, 100)).toBe(0);
  });

  test('rounds to 2 decimal places', () => {
    expect(applyDiscount(9.99, 10)).toBe(8.99);
  });

  test('throws for a non-positive price', () => {
    expect(() => applyDiscount(0, 10)).toThrow('price must be a positive number');
  });

  test('throws for a negative price', () => {
    expect(() => applyDiscount(-5, 10)).toThrow('price must be a positive number');
  });

  test('throws for a discount below 0', () => {
    expect(() => applyDiscount(10, -1)).toThrow('discountPercent must be a number between 0 and 100');
  });

  test('throws for a discount above 100', () => {
    expect(() => applyDiscount(10, 101)).toThrow('discountPercent must be a number between 0 and 100');
  });

  test('throws for a non-numeric discount', () => {
    expect(() => applyDiscount(10, '20')).toThrow('discountPercent must be a number between 0 and 100');
  });
});

describe('isValidEmail', () => {
  test('returns true for a standard email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  test('returns true for an email with subdomains', () => {
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
  });

  test('returns true for an email with plus sign', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  test('returns false for an email missing @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  test('returns false for an email missing domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  test('returns false for an email with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  test('returns false for an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  test('returns false for a non-string value', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(42)).toBe(false);
  });
});

describe('paginate', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  test('returns the first page correctly', () => {
    const result = paginate(items, 1, 3);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(3);
    expect(result.total).toBe(10);
    expect(result.totalPages).toBe(4);
  });

  test('returns the last partial page correctly', () => {
    const result = paginate(items, 4, 3);
    expect(result.items).toEqual([10]);
  });

  test('returns an empty items array for a page beyond the last', () => {
    const result = paginate(items, 5, 3);
    expect(result.items).toEqual([]);
  });

  test('handles a pageSize larger than the total number of items', () => {
    const result = paginate(items, 1, 20);
    expect(result.items).toEqual(items);
    expect(result.totalPages).toBe(1);
  });

  test('handles an empty array', () => {
    const result = paginate([], 1, 5);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  test('throws for a non-array items argument', () => {
    expect(() => paginate('not-array', 1, 5)).toThrow('items must be an array');
  });

  test('throws for page = 0', () => {
    expect(() => paginate(items, 0, 5)).toThrow('page must be a positive integer');
  });

  test('throws for a negative page', () => {
    expect(() => paginate(items, -1, 5)).toThrow('page must be a positive integer');
  });

  test('throws for pageSize = 0', () => {
    expect(() => paginate(items, 1, 0)).toThrow('pageSize must be a positive integer');
  });

  test('throws for a float pageSize', () => {
    expect(() => paginate(items, 1, 2.5)).toThrow('pageSize must be a positive integer');
  });
});
