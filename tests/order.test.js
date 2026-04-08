'use strict';

const { OrderProcessor, OrderNotFoundError, InvalidOrderStatusTransitionError, _resetIdCounter } = require('../src/order');
const { ValidationError } = require('../src/product');

function makeItems(overrides = []) {
  return overrides.length
    ? overrides
    : [{ productId: 'prod-1', name: 'Widget', unitPrice: 1000, quantity: 2 }];
}

describe('OrderProcessor', () => {
  let proc;

  beforeEach(() => {
    _resetIdCounter();
    proc = new OrderProcessor();
  });

  // ───────────────────────── createOrder ─────────────────────────

  describe('createOrder', () => {
    test('creates an order with default status pending', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      expect(o.status).toBe('pending');
    });

    test('generates a unique sequential id', () => {
      const o1 = proc.createOrder({ userId: 'u1', items: makeItems() });
      const o2 = proc.createOrder({ userId: 'u2', items: makeItems() });
      expect(o1.id).toBe('ORD-000001');
      expect(o2.id).toBe('ORD-000002');
    });

    test('calculates subtotalCents correctly', () => {
      const o = proc.createOrder({
        userId: 'u1',
        items: [
          { productId: 'p1', name: 'A', unitPrice: 500, quantity: 2 },
          { productId: 'p2', name: 'B', unitPrice: 300, quantity: 1 },
        ],
      });
      expect(o.subtotalCents).toBe(1300);
    });

    test('applies discountCents and calculates totalCents', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems(), discountCents: 200 });
      expect(o.subtotalCents).toBe(2000);
      expect(o.discountCents).toBe(200);
      expect(o.totalCents).toBe(1800);
    });

    test('totalCents is 0 when discount >= subtotal', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems(), discountCents: 5000 });
      expect(o.totalCents).toBe(0);
    });

    test('stores couponCode when provided', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems(), couponCode: 'SAVE10' });
      expect(o.couponCode).toBe('SAVE10');
    });

    test('couponCode is null by default', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      expect(o.couponCode).toBeNull();
    });

    test('trims userId', () => {
      const o = proc.createOrder({ userId: '  u1  ', items: makeItems() });
      expect(o.userId).toBe('u1');
    });

    test('sets createdAt and updatedAt as Dates', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      expect(o.createdAt).toBeInstanceOf(Date);
      expect(o.updatedAt).toBeInstanceOf(Date);
    });

    test('returns a snapshot – mutation does not affect stored order', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      o.status = 'paid';
      expect(proc.getOrder(o.id).status).toBe('pending');
    });

    test.each([
      ['empty userId', { userId: '' }],
      ['whitespace userId', { userId: '   ' }],
      ['empty items array', { items: [] }],
      ['non-array items', { items: null }],
    ])('throws ValidationError for %s', (_, override) => {
      const base = { userId: 'u1', items: makeItems() };
      expect(() => proc.createOrder({ ...base, ...override })).toThrow(ValidationError);
    });

    test('throws ValidationError for item with invalid unitPrice', () => {
      const items = [{ productId: 'p', name: 'X', unitPrice: -1, quantity: 1 }];
      expect(() => proc.createOrder({ userId: 'u1', items })).toThrow(ValidationError);
    });

    test('throws ValidationError for item with empty productId string', () => {
      const items = [{ productId: '', name: 'X', unitPrice: 100, quantity: 1 }];
      expect(() => proc.createOrder({ userId: 'u1', items })).toThrow(ValidationError);
    });

    test('throws ValidationError for item with float quantity', () => {
      const items = [{ productId: 'p', name: 'X', unitPrice: 100, quantity: 1.5 }];
      expect(() => proc.createOrder({ userId: 'u1', items })).toThrow(ValidationError);
    });

    test('throws ValidationError for item with zero quantity', () => {
      const items = [{ productId: 'p', name: 'X', unitPrice: 100, quantity: 0 }];
      expect(() => proc.createOrder({ userId: 'u1', items })).toThrow(ValidationError);
    });

    test('throws ValidationError for negative discountCents', () => {
      expect(() => proc.createOrder({ userId: 'u1', items: makeItems(), discountCents: -1 })).toThrow(ValidationError);
    });
  });

  // ───────────────────────── getOrder ─────────────────────────

  describe('getOrder', () => {
    test('returns the created order', () => {
      const created = proc.createOrder({ userId: 'u1', items: makeItems() });
      const fetched = proc.getOrder(created.id);
      expect(fetched.id).toBe(created.id);
    });

    test('throws OrderNotFoundError for unknown id', () => {
      expect(() => proc.getOrder('ORD-999999')).toThrow(OrderNotFoundError);
    });
  });

  // ───────────────────────── transitionStatus ─────────────────────────

  describe('transitionStatus', () => {
    test('transitions pending -> paid', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      const updated = proc.transitionStatus(o.id, 'paid');
      expect(updated.status).toBe('paid');
    });

    test('transitions pending -> cancelled', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      proc.transitionStatus(o.id, 'cancelled');
      expect(proc.getOrder(o.id).status).toBe('cancelled');
    });

    test('transitions paid -> fulfilled', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      proc.transitionStatus(o.id, 'paid');
      proc.transitionStatus(o.id, 'fulfilled');
      expect(proc.getOrder(o.id).status).toBe('fulfilled');
    });

    test('transitions paid -> refunded', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      proc.transitionStatus(o.id, 'paid');
      proc.transitionStatus(o.id, 'refunded');
      expect(proc.getOrder(o.id).status).toBe('refunded');
    });

    test('transitions fulfilled -> refunded', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      proc.transitionStatus(o.id, 'paid');
      proc.transitionStatus(o.id, 'fulfilled');
      proc.transitionStatus(o.id, 'refunded');
      expect(proc.getOrder(o.id).status).toBe('refunded');
    });

    test('updates updatedAt on transition', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      const before = o.updatedAt;
      const after = proc.transitionStatus(o.id, 'paid');
      expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    test('throws InvalidOrderStatusTransitionError for pending -> fulfilled', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      expect(() => proc.transitionStatus(o.id, 'fulfilled')).toThrow(InvalidOrderStatusTransitionError);
    });

    test('throws InvalidOrderStatusTransitionError for pending -> refunded', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      expect(() => proc.transitionStatus(o.id, 'refunded')).toThrow(InvalidOrderStatusTransitionError);
    });

    test('throws InvalidOrderStatusTransitionError for cancelled -> paid', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      proc.transitionStatus(o.id, 'cancelled');
      expect(() => proc.transitionStatus(o.id, 'paid')).toThrow(InvalidOrderStatusTransitionError);
    });

    test('throws InvalidOrderStatusTransitionError for refunded -> any', () => {
      const o = proc.createOrder({ userId: 'u1', items: makeItems() });
      proc.transitionStatus(o.id, 'paid');
      proc.transitionStatus(o.id, 'refunded');
      expect(() => proc.transitionStatus(o.id, 'cancelled')).toThrow(InvalidOrderStatusTransitionError);
    });

    test('throws OrderNotFoundError for unknown id', () => {
      expect(() => proc.transitionStatus('ORD-999999', 'paid')).toThrow(OrderNotFoundError);
    });
  });

  // ───────────────────────── getOrdersByUser ─────────────────────────

  describe('getOrdersByUser', () => {
    test('returns only orders belonging to the user', () => {
      proc.createOrder({ userId: 'u1', items: makeItems() });
      proc.createOrder({ userId: 'u2', items: makeItems() });
      proc.createOrder({ userId: 'u1', items: makeItems() });
      const orders = proc.getOrdersByUser('u1');
      expect(orders).toHaveLength(2);
      expect(orders.every(o => o.userId === 'u1')).toBe(true);
    });

    test('returns empty array for user with no orders', () => {
      expect(proc.getOrdersByUser('nobody')).toEqual([]);
    });
  });

  // ───────────────────────── getOrdersByStatus ─────────────────────────

  describe('getOrdersByStatus', () => {
    test('returns orders with matching status', () => {
      const o1 = proc.createOrder({ userId: 'u1', items: makeItems() });
      proc.createOrder({ userId: 'u2', items: makeItems() });
      proc.transitionStatus(o1.id, 'paid');
      const paid = proc.getOrdersByStatus('paid');
      expect(paid).toHaveLength(1);
      expect(paid[0].id).toBe(o1.id);
    });

    test('returns empty array when no matching orders', () => {
      proc.createOrder({ userId: 'u1', items: makeItems() });
      expect(proc.getOrdersByStatus('fulfilled')).toEqual([]);
    });
  });

  // ───────────────────────── error names ─────────────────────────

  describe('error classes', () => {
    test('OrderNotFoundError has correct name', () => {
      expect(new OrderNotFoundError('x').name).toBe('OrderNotFoundError');
    });
    test('InvalidOrderStatusTransitionError has correct name', () => {
      expect(new InvalidOrderStatusTransitionError('a', 'b').name).toBe('InvalidOrderStatusTransitionError');
    });
  });
});
