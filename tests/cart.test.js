'use strict';

const { Cart, CartItemNotFoundError } = require('../src/cart');
const { ValidationError } = require('../src/product');

function makeItem(overrides = {}) {
  return {
    productId: 'prod-1',
    name: 'Test Product',
    unitPrice: 1999,
    quantity: 1,
    ...overrides,
  };
}

describe('Cart', () => {
  // ───────────────────────── constructor ─────────────────────────

  describe('constructor', () => {
    test('creates a cart with the given userId', () => {
      const cart = new Cart('user-1');
      expect(cart.userId).toBe('user-1');
    });

    test('trims whitespace from userId', () => {
      const cart = new Cart('  user-1  ');
      expect(cart.userId).toBe('user-1');
    });

    test('creates an empty cart', () => {
      const cart = new Cart('user-1');
      expect(cart.isEmpty).toBe(true);
      expect(cart.itemCount).toBe(0);
    });

    test('throws ValidationError for empty userId', () => {
      expect(() => new Cart('')).toThrow(ValidationError);
    });

    test('throws ValidationError for whitespace userId', () => {
      expect(() => new Cart('   ')).toThrow(ValidationError);
    });

    test('throws ValidationError for non-string userId', () => {
      expect(() => new Cart(null)).toThrow(ValidationError);
    });

    test('sets createdAt to a Date', () => {
      const cart = new Cart('u');
      expect(cart.createdAt).toBeInstanceOf(Date);
    });
  });

  // ───────────────────────── addItem ─────────────────────────

  describe('addItem', () => {
    let cart;
    beforeEach(() => { cart = new Cart('user-1'); });

    test('adds a new item to the cart', () => {
      cart.addItem(makeItem());
      expect(cart.itemCount).toBe(1);
    });

    test('adds item with explicit quantity', () => {
      cart.addItem(makeItem({ quantity: 3 }));
      expect(cart.getItems()[0].quantity).toBe(3);
    });

    test('defaults quantity to 1 when not specified', () => {
      cart.addItem({ productId: 'p', name: 'P', unitPrice: 100 });
      expect(cart.getItems()[0].quantity).toBe(1);
    });

    test('increments quantity when same productId is added again', () => {
      cart.addItem(makeItem({ quantity: 2 }));
      cart.addItem(makeItem({ quantity: 3 }));
      expect(cart.itemCount).toBe(1);
      expect(cart.getItems()[0].quantity).toBe(5);
    });

    test('adds multiple distinct products', () => {
      cart.addItem(makeItem({ productId: 'p1' }));
      cart.addItem(makeItem({ productId: 'p2' }));
      expect(cart.itemCount).toBe(2);
    });

    test('allows free products (unitPrice = 0)', () => {
      cart.addItem(makeItem({ unitPrice: 0 }));
      expect(cart.getItems()[0].unitPrice).toBe(0);
    });

    test.each([
      ['empty productId', { productId: '' }],
      ['null productId', { productId: null }],
      ['empty name', { name: '' }],
      ['negative unitPrice', { unitPrice: -1 }],
      ['float unitPrice', { unitPrice: 1.5 }],
      ['string unitPrice', { unitPrice: '10' }],
      ['zero quantity', { quantity: 0 }],
      ['negative quantity', { quantity: -1 }],
      ['float quantity', { quantity: 1.5 }],
    ])('throws ValidationError for %s', (_, override) => {
      expect(() => cart.addItem(makeItem(override))).toThrow(ValidationError);
    });
  });

  // ───────────────────────── setQuantity ─────────────────────────

  describe('setQuantity', () => {
    let cart;
    beforeEach(() => {
      cart = new Cart('user-1');
      cart.addItem(makeItem());
    });

    test('updates quantity of existing item', () => {
      cart.setQuantity('prod-1', 5);
      expect(cart.getItems()[0].quantity).toBe(5);
    });

    test('removes item when quantity is set to 0', () => {
      cart.setQuantity('prod-1', 0);
      expect(cart.isEmpty).toBe(true);
    });

    test('throws CartItemNotFoundError for unknown productId', () => {
      expect(() => cart.setQuantity('ghost', 1)).toThrow(CartItemNotFoundError);
    });

    test('throws ValidationError for negative quantity', () => {
      expect(() => cart.setQuantity('prod-1', -1)).toThrow(ValidationError);
    });

    test('throws ValidationError for float quantity', () => {
      expect(() => cart.setQuantity('prod-1', 1.5)).toThrow(ValidationError);
    });
  });

  // ───────────────────────── removeItem ─────────────────────────

  describe('removeItem', () => {
    let cart;
    beforeEach(() => {
      cart = new Cart('user-1');
      cart.addItem(makeItem());
    });

    test('removes an existing item', () => {
      cart.removeItem('prod-1');
      expect(cart.isEmpty).toBe(true);
    });

    test('throws CartItemNotFoundError for unknown productId', () => {
      expect(() => cart.removeItem('ghost')).toThrow(CartItemNotFoundError);
    });
  });

  // ───────────────────────── getItems ─────────────────────────

  describe('getItems', () => {
    test('returns empty array for empty cart', () => {
      expect(new Cart('u').getItems()).toEqual([]);
    });

    test('returns copies – mutation does not affect cart', () => {
      const cart = new Cart('u');
      cart.addItem(makeItem());
      const items = cart.getItems();
      items[0].unitPrice = 0;
      expect(cart.getItems()[0].unitPrice).toBe(1999);
    });

    test('returns all items', () => {
      const cart = new Cart('u');
      cart.addItem(makeItem({ productId: 'p1', unitPrice: 100 }));
      cart.addItem(makeItem({ productId: 'p2', unitPrice: 200 }));
      expect(cart.getItems()).toHaveLength(2);
    });
  });

  // ───────────────────────── getSubtotal ─────────────────────────

  describe('getSubtotal', () => {
    test('returns 0 for empty cart', () => {
      expect(new Cart('u').getSubtotal()).toBe(0);
    });

    test('calculates subtotal correctly', () => {
      const cart = new Cart('u');
      cart.addItem(makeItem({ productId: 'p1', unitPrice: 1000, quantity: 2 }));
      cart.addItem(makeItem({ productId: 'p2', unitPrice: 500, quantity: 1 }));
      expect(cart.getSubtotal()).toBe(2500);
    });

    test('accounts for quantity > 1', () => {
      const cart = new Cart('u');
      cart.addItem(makeItem({ unitPrice: 999, quantity: 3 }));
      expect(cart.getSubtotal()).toBe(2997);
    });
  });

  // ───────────────────────── totalUnits ─────────────────────────

  describe('totalUnits', () => {
    test('returns 0 for empty cart', () => {
      expect(new Cart('u').totalUnits).toBe(0);
    });

    test('sums quantities across all items', () => {
      const cart = new Cart('u');
      cart.addItem(makeItem({ productId: 'p1', quantity: 3 }));
      cart.addItem(makeItem({ productId: 'p2', quantity: 2 }));
      expect(cart.totalUnits).toBe(5);
    });
  });

  // ───────────────────────── clear ─────────────────────────

  describe('clear', () => {
    test('removes all items', () => {
      const cart = new Cart('u');
      cart.addItem(makeItem({ productId: 'p1' }));
      cart.addItem(makeItem({ productId: 'p2' }));
      cart.clear();
      expect(cart.isEmpty).toBe(true);
      expect(cart.itemCount).toBe(0);
    });

    test('is a no-op on empty cart', () => {
      const cart = new Cart('u');
      expect(() => cart.clear()).not.toThrow();
    });
  });

  // ───────────────────────── error names ─────────────────────────

  describe('error classes', () => {
    test('CartItemNotFoundError has correct name', () => {
      expect(new CartItemNotFoundError('p').name).toBe('CartItemNotFoundError');
    });
  });
});
