'use strict';

/**
 * Validates that a value is a non-empty string.
 * @param {*} value
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates that a value is a positive number.
 * @param {*} value
 * @returns {boolean}
 */
function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Validates that a value is a non-negative integer.
 * @param {*} value
 * @returns {boolean}
 */
function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Formats a price value to two decimal places as a string (e.g. "9.99").
 * @param {number} amount
 * @returns {string}
 */
function formatPrice(amount) {
  if (!isPositiveNumber(amount) && amount !== 0) {
    throw new Error('Invalid amount: must be a non-negative finite number');
  }
  return amount.toFixed(2);
}

/**
 * Generates a simple sequential ID string with a given prefix.
 * @param {string} prefix
 * @param {number} sequence
 * @returns {string}
 */
function generateId(prefix, sequence) {
  if (!isNonEmptyString(prefix)) {
    throw new Error('prefix must be a non-empty string');
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('sequence must be a positive integer');
  }
  return `${prefix.toUpperCase()}-${String(sequence).padStart(6, '0')}`;
}

/**
 * Calculates a percentage discount on a price.
 * @param {number} price  Original price (> 0)
 * @param {number} discountPercent  Discount percentage (0–100)
 * @returns {number} Discounted price, rounded to 2 decimal places
 */
function applyDiscount(price, discountPercent) {
  if (!isPositiveNumber(price)) {
    throw new Error('price must be a positive number');
  }
  if (
    typeof discountPercent !== 'number' ||
    !Number.isFinite(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > 100
  ) {
    throw new Error('discountPercent must be a number between 0 and 100');
  }
  const discounted = price * (1 - discountPercent / 100);
  return Math.round(discounted * 100) / 100;
}

/**
 * Validates an email address format.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Paginates an array.
 * @param {Array} items
 * @param {number} page  1-based page number
 * @param {number} pageSize
 * @returns {{ items: Array, total: number, page: number, pageSize: number, totalPages: number }}
 */
function paginate(items, page, pageSize) {
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('page must be a positive integer');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('pageSize must be a positive integer');
  }
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: items.slice(start, end),
    total,
    page,
    pageSize,
    totalPages,
  };
}

module.exports = {
  isNonEmptyString,
  isPositiveNumber,
  isNonNegativeInteger,
  formatPrice,
  generateId,
  applyDiscount,
  isValidEmail,
  paginate,
};
