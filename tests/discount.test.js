'use strict';

const { DiscountEngine, CouponNotFoundError, CouponExpiredError, CouponUsageLimitError } = require('../src/discount');
const { ValidationError } = require('../src/product');

function engine() {
  return new DiscountEngine();
}

function couponData(overrides = {}) {
  return {
    code: 'SAVE10',
    type: 'percentage',
    value: 10,
    ...overrides,
  };
}

describe('DiscountEngine', () => {
  // ───────────────────────── createCoupon ─────────────────────────

  describe('createCoupon', () => {
    test('creates a percentage coupon', () => {
      const de = engine();
      const c = de.createCoupon(couponData());
      expect(c.code).toBe('SAVE10');
      expect(c.type).toBe('percentage');
      expect(c.value).toBe(10);
    });

    test('creates a fixed coupon', () => {
      const de = engine();
      const c = de.createCoupon(couponData({ type: 'fixed', value: 500 }));
      expect(c.type).toBe('fixed');
      expect(c.value).toBe(500);
    });

    test('normalises code to uppercase', () => {
      const de = engine();
      const c = de.createCoupon(couponData({ code: 'save10' }));
      expect(c.code).toBe('SAVE10');
    });

    test('defaults usageLimit to -1 (unlimited)', () => {
      const c = engine().createCoupon(couponData());
      expect(c.usageLimit).toBe(-1);
    });

    test('respects explicit usageLimit', () => {
      const c = engine().createCoupon(couponData({ usageLimit: 5 }));
      expect(c.usageLimit).toBe(5);
    });

    test('defaults expiresAt to null', () => {
      const c = engine().createCoupon(couponData());
      expect(c.expiresAt).toBeNull();
    });

    test('sets expiresAt when provided', () => {
      const exp = new Date('2030-01-01');
      const c = engine().createCoupon(couponData({ expiresAt: exp }));
      expect(c.expiresAt).toEqual(exp);
    });

    test('defaults active to true', () => {
      const c = engine().createCoupon(couponData());
      expect(c.active).toBe(true);
    });

    test('defaults minOrderCents to 0', () => {
      const c = engine().createCoupon(couponData());
      expect(c.minOrderCents).toBe(0);
    });

    test('sets minOrderCents when provided', () => {
      const c = engine().createCoupon(couponData({ minOrderCents: 1000 }));
      expect(c.minOrderCents).toBe(1000);
    });

    test('throws ValidationError for duplicate code', () => {
      const de = engine();
      de.createCoupon(couponData());
      expect(() => de.createCoupon(couponData())).toThrow(ValidationError);
    });

    test.each([
      ['empty code', { code: '' }],
      ['invalid type', { type: 'bogus' }],
      ['zero value', { value: 0 }],
      ['negative value', { value: -5 }],
      ['percentage > 100', { type: 'percentage', value: 101 }],
    ])('throws ValidationError for %s', (_, override) => {
      expect(() => engine().createCoupon(couponData(override))).toThrow(ValidationError);
    });
  });

  // ───────────────────────── getCoupon ─────────────────────────

  describe('getCoupon', () => {
    test('retrieves a coupon by code', () => {
      const de = engine();
      de.createCoupon(couponData());
      const c = de.getCoupon('SAVE10');
      expect(c.code).toBe('SAVE10');
    });

    test('is case-insensitive', () => {
      const de = engine();
      de.createCoupon(couponData());
      expect(de.getCoupon('save10').code).toBe('SAVE10');
    });

    test('throws CouponNotFoundError for unknown code', () => {
      expect(() => engine().getCoupon('NOPE')).toThrow(CouponNotFoundError);
    });

    test('throws CouponNotFoundError for non-string code', () => {
      expect(() => engine().getCoupon(null)).toThrow(CouponNotFoundError);
    });

    test('returns a copy – mutation does not affect engine', () => {
      const de = engine();
      de.createCoupon(couponData());
      const c = de.getCoupon('SAVE10');
      c.value = 99;
      expect(de.getCoupon('SAVE10').value).toBe(10);
    });
  });

  // ───────────────────────── applyDiscount ─────────────────────────

  describe('applyDiscount', () => {
    test('applies a percentage discount correctly', () => {
      const de = engine();
      de.createCoupon(couponData({ value: 20 }));
      expect(de.applyDiscount('SAVE10', 1000)).toBe(200);
    });

    test('floors fractional cents on percentage discount', () => {
      const de = engine();
      de.createCoupon(couponData({ value: 10 })); // 10% of 99 = 9.9 -> floor = 9
      expect(de.applyDiscount('SAVE10', 99)).toBe(9);
    });

    test('applies a fixed discount correctly', () => {
      const de = engine();
      de.createCoupon(couponData({ type: 'fixed', value: 500 }));
      expect(de.applyDiscount('SAVE10', 2000)).toBe(500);
    });

    test('caps fixed discount at subtotal (no negative totals)', () => {
      const de = engine();
      de.createCoupon(couponData({ type: 'fixed', value: 5000 }));
      expect(de.applyDiscount('SAVE10', 1000)).toBe(1000);
    });

    test('is case-insensitive for code lookup', () => {
      const de = engine();
      de.createCoupon(couponData({ value: 10 }));
      expect(de.applyDiscount('save10', 1000)).toBe(100);
    });

    test('throws CouponNotFoundError for unknown code', () => {
      expect(() => engine().applyDiscount('NOPE', 1000)).toThrow(CouponNotFoundError);
    });

    test('throws ValidationError when coupon is inactive', () => {
      const de = engine();
      de.createCoupon(couponData({ active: false }));
      expect(() => de.applyDiscount('SAVE10', 1000)).toThrow(ValidationError);
    });

    test('throws CouponExpiredError when coupon is past expiry', () => {
      const de = engine();
      de.createCoupon(couponData({ expiresAt: new Date('2000-01-01') }));
      expect(() => de.applyDiscount('SAVE10', 1000)).toThrow(CouponExpiredError);
    });

    test('does NOT throw for coupon with future expiry', () => {
      const de = engine();
      de.createCoupon(couponData({ expiresAt: new Date('2099-01-01') }));
      expect(() => de.applyDiscount('SAVE10', 1000)).not.toThrow();
    });

    test('throws CouponUsageLimitError when limit is reached', () => {
      const de = engine();
      de.createCoupon(couponData({ usageLimit: 1 }));
      de.recordUsage('SAVE10');
      expect(() => de.applyDiscount('SAVE10', 1000)).toThrow(CouponUsageLimitError);
    });

    test('does not throw when under usage limit', () => {
      const de = engine();
      de.createCoupon(couponData({ usageLimit: 3 }));
      de.recordUsage('SAVE10');
      de.recordUsage('SAVE10');
      expect(() => de.applyDiscount('SAVE10', 1000)).not.toThrow();
    });

    test('throws ValidationError when subtotal is below minOrderCents', () => {
      const de = engine();
      de.createCoupon(couponData({ minOrderCents: 2000 }));
      expect(() => de.applyDiscount('SAVE10', 1999)).toThrow(ValidationError);
    });

    test('does not throw when subtotal equals minOrderCents', () => {
      const de = engine();
      de.createCoupon(couponData({ minOrderCents: 2000 }));
      expect(() => de.applyDiscount('SAVE10', 2000)).not.toThrow();
    });

    test('throws ValidationError for non-integer subtotalCents', () => {
      const de = engine();
      de.createCoupon(couponData());
      expect(() => de.applyDiscount('SAVE10', 9.9)).toThrow(ValidationError);
    });

    test('throws ValidationError for negative subtotalCents', () => {
      const de = engine();
      de.createCoupon(couponData());
      expect(() => de.applyDiscount('SAVE10', -1)).toThrow(ValidationError);
    });

    test('allows subtotal of 0', () => {
      const de = engine();
      de.createCoupon(couponData({ type: 'fixed', value: 100 }));
      expect(de.applyDiscount('SAVE10', 0)).toBe(0);
    });
  });

  // ───────────────────────── recordUsage ─────────────────────────

  describe('recordUsage', () => {
    test('increments usageCount', () => {
      const de = engine();
      de.createCoupon(couponData());
      de.recordUsage('SAVE10');
      de.recordUsage('SAVE10');
      expect(de.getCoupon('SAVE10').usageCount).toBe(2);
    });

    test('throws CouponNotFoundError for unknown code', () => {
      expect(() => engine().recordUsage('GHOST')).toThrow(CouponNotFoundError);
    });
  });

  // ───────────────────────── deactivateCoupon ─────────────────────────

  describe('deactivateCoupon', () => {
    test('sets active to false', () => {
      const de = engine();
      de.createCoupon(couponData());
      de.deactivateCoupon('SAVE10');
      expect(de.getCoupon('SAVE10').active).toBe(false);
    });

    test('throws CouponNotFoundError for unknown code', () => {
      expect(() => engine().deactivateCoupon('GHOST')).toThrow(CouponNotFoundError);
    });
  });

  // ───────────────────────── error names ─────────────────────────

  describe('error classes', () => {
    test('CouponNotFoundError has correct name', () => {
      expect(new CouponNotFoundError('X').name).toBe('CouponNotFoundError');
    });
    test('CouponExpiredError has correct name', () => {
      expect(new CouponExpiredError('X').name).toBe('CouponExpiredError');
    });
    test('CouponUsageLimitError has correct name', () => {
      expect(new CouponUsageLimitError('X').name).toBe('CouponUsageLimitError');
    });
  });
});
