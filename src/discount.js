'use strict';

/**
 * Discount / coupon system for the digital store.
 */

const { ValidationError } = require('./product');

class CouponNotFoundError extends Error {
  constructor(code) {
    super(`Coupon not found: ${code}`);
    this.name = 'CouponNotFoundError';
  }
}

class CouponExpiredError extends Error {
  constructor(code) {
    super(`Coupon has expired: ${code}`);
    this.name = 'CouponExpiredError';
  }
}

class CouponUsageLimitError extends Error {
  constructor(code) {
    super(`Coupon usage limit reached: ${code}`);
    this.name = 'CouponUsageLimitError';
  }
}

/**
 * @typedef {'percentage'|'fixed'} DiscountType
 * @typedef {Object} Coupon
 * @property {string} code
 * @property {DiscountType} type
 * @property {number} value        - Percentage (0-100) or fixed amount in cents
 * @property {number} usageLimit   - Max redemptions (-1 = unlimited)
 * @property {number} usageCount
 * @property {Date|null} expiresAt
 * @property {boolean} active
 * @property {number} [minOrderCents] - Minimum order total in cents to apply
 */

function validateCouponData(data) {
  if (!data.code || typeof data.code !== 'string' || data.code.trim() === '') {
    throw new ValidationError('Coupon code must be a non-empty string');
  }
  if (data.type !== 'percentage' && data.type !== 'fixed') {
    throw new ValidationError("Coupon type must be 'percentage' or 'fixed'");
  }
  if (typeof data.value !== 'number' || data.value <= 0) {
    throw new ValidationError('Coupon value must be a positive number');
  }
  if (data.type === 'percentage' && data.value > 100) {
    throw new ValidationError('Percentage discount cannot exceed 100');
  }
}

class DiscountEngine {
  constructor() {
    this._coupons = new Map();
  }

  /**
   * Creates a new coupon.
   * @param {Object} data
   * @returns {Coupon}
   */
  createCoupon(data) {
    validateCouponData(data);
    const code = data.code.trim().toUpperCase();
    if (this._coupons.has(code)) {
      throw new ValidationError(`Coupon code already exists: ${code}`);
    }
    const coupon = {
      code,
      type: data.type,
      value: data.value,
      usageLimit: typeof data.usageLimit === 'number' ? data.usageLimit : -1,
      usageCount: 0,
      expiresAt: data.expiresAt instanceof Date ? data.expiresAt : null,
      active: data.active !== false,
      minOrderCents: typeof data.minOrderCents === 'number' ? data.minOrderCents : 0,
    };
    this._coupons.set(code, coupon);
    return { ...coupon };
  }

  /**
   * Retrieves a coupon (throws if not found).
   * @param {string} code
   * @returns {Coupon}
   */
  getCoupon(code) {
    const key = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const coupon = this._coupons.get(key);
    if (!coupon) throw new CouponNotFoundError(key);
    return { ...coupon };
  }

  /**
   * Applies a coupon to an order subtotal and returns the discount amount (in cents).
   * Also validates eligibility but does NOT increment usage – call recordUsage after payment.
   *
   * @param {string} code
   * @param {number} subtotalCents
   * @returns {number} discount in cents
   */
  applyDiscount(code, subtotalCents) {
    if (typeof subtotalCents !== 'number' || !Number.isInteger(subtotalCents) || subtotalCents < 0) {
      throw new ValidationError('subtotalCents must be a non-negative integer');
    }

    const key = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const coupon = this._coupons.get(key);
    if (!coupon) throw new CouponNotFoundError(key);
    if (!coupon.active) throw new ValidationError(`Coupon ${key} is not active`);
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new CouponExpiredError(key);
    if (coupon.usageLimit !== -1 && coupon.usageCount >= coupon.usageLimit) {
      throw new CouponUsageLimitError(key);
    }
    if (subtotalCents < coupon.minOrderCents) {
      throw new ValidationError(
        `Order total ${subtotalCents} cents is below minimum ${coupon.minOrderCents} cents for coupon ${key}`
      );
    }

    if (coupon.type === 'percentage') {
      return Math.floor((subtotalCents * coupon.value) / 100);
    }
    // fixed
    return Math.min(coupon.value, subtotalCents);
  }

  /**
   * Increments usage count for a coupon after successful payment.
   * @param {string} code
   */
  recordUsage(code) {
    const key = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const coupon = this._coupons.get(key);
    if (!coupon) throw new CouponNotFoundError(key);
    coupon.usageCount += 1;
  }

  /**
   * Deactivates a coupon.
   * @param {string} code
   */
  deactivateCoupon(code) {
    const key = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const coupon = this._coupons.get(key);
    if (!coupon) throw new CouponNotFoundError(key);
    coupon.active = false;
  }
}

module.exports = {
  DiscountEngine,
  CouponNotFoundError,
  CouponExpiredError,
  CouponUsageLimitError,
};
