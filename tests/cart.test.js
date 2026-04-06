'use strict';

const { getCart, addToCart, updateCartItem, removeFromCart, clearCart, getCartTotal, _reset: resetCart } = require('../src/cart');
const { createProduct, _reset: resetProducts } = require('../src/products');

let productA, productB;

beforeEach(() => {
  resetProducts();
  resetCart();
  productA = createProduct({ name: 'Alpha', description: 'desc', price: 10.00, category: 'test', stock: 20 });
  productB = createProduct({ name: 'Beta', description: 'desc', price: 5.50, category: 'test', stock: 5 });
});

describe('getCart', () => {
  test('creates an empty cart for a new user', () => {
    const cart = getCart('user1');
    expect(cart.items).toEqual([]);
  });

  test('returns the same cart on subsequent calls', () => {
    addToCart('user1', productA.id, 2);
    const cart = getCart('user1');
    expect(cart.items).toHaveLength(1);
  });

  test('throws when userId is missing', () => {
    expect(() => getCart('')).toThrow('userId is required');
  });

  test('returns a copy, not a reference', () => {
    const cart = getCart('user1');
    cart.items.push({ fake: true });
    expect(getCart('user1').items).toHaveLength(0);
  });
});

describe('addToCart', () => {
  test('adds an item to an empty cart', () => {
    const cart = addToCart('user1', productA.id, 1);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].productId).toBe(productA.id);
    expect(cart.items[0].quantity).toBe(1);
    expect(cart.items[0].priceAtAdd).toBe(10.00);
  });

  test('uses default quantity of 1', () => {
    const cart = addToCart('user1', productA.id);
    expect(cart.items[0].quantity).toBe(1);
  });

  test('increments quantity when the same product is added again', () => {
    addToCart('user1', productA.id, 3);
    const cart = addToCart('user1', productA.id, 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);
  });

  test('adds different products as separate line items', () => {
    addToCart('user1', productA.id, 1);
    const cart = addToCart('user1', productB.id, 2);
    expect(cart.items).toHaveLength(2);
  });

  test('throws when userId is empty', () => {
    expect(() => addToCart('', productA.id, 1)).toThrow('userId is required');
  });

  test('throws when productId is empty', () => {
    expect(() => addToCart('user1', '', 1)).toThrow('productId is required');
  });

  test('throws for a non-existent product', () => {
    expect(() => addToCart('user1', 'PRD-999999', 1)).toThrow('Product not found');
  });

  test('throws when quantity is zero', () => {
    expect(() => addToCart('user1', productA.id, 0)).toThrow('quantity must be a positive integer');
  });

  test('throws when quantity is a float', () => {
    expect(() => addToCart('user1', productA.id, 1.5)).toThrow('quantity must be a positive integer');
  });

  test('throws when quantity exceeds available stock', () => {
    expect(() => addToCart('user1', productA.id, 100)).toThrow('Insufficient stock');
  });

  test('throws when combined quantity exceeds available stock', () => {
    addToCart('user1', productB.id, 4);
    expect(() => addToCart('user1', productB.id, 2)).toThrow('Insufficient stock');
  });

  test('throws when product is inactive', () => {
    const { deleteProduct } = require('../src/products');
    deleteProduct(productA.id);
    expect(() => addToCart('user1', productA.id, 1)).toThrow('Product is not available');
  });
});

describe('updateCartItem', () => {
  beforeEach(() => {
    addToCart('user1', productA.id, 3);
  });

  test('updates the quantity of an existing item', () => {
    const cart = updateCartItem('user1', productA.id, 5);
    expect(cart.items[0].quantity).toBe(5);
  });

  test('removes the item when quantity is set to 0', () => {
    const cart = updateCartItem('user1', productA.id, 0);
    expect(cart.items).toHaveLength(0);
  });

  test('throws when cart does not exist for user', () => {
    expect(() => updateCartItem('unknown', productA.id, 1)).toThrow('Cart not found');
  });

  test('throws when item is not in the cart', () => {
    expect(() => updateCartItem('user1', productB.id, 1)).toThrow('Item not in cart');
  });

  test('throws when userId is empty', () => {
    expect(() => updateCartItem('', productA.id, 1)).toThrow('userId is required');
  });

  test('throws when productId is empty', () => {
    expect(() => updateCartItem('user1', '', 1)).toThrow('productId is required');
  });

  test('throws when the product for the cart item no longer exists', () => {
    addToCart('user1', productA.id, 2);
    // Wipe the products store so getProductById returns null
    const { _reset: resetProductsInline } = require('../src/products');
    resetProductsInline();
    expect(() => updateCartItem('user1', productA.id, 5)).toThrow('Product not found');
  });



  test('throws when quantity is undefined (non-integer)', () => {
    expect(() => updateCartItem('user1', productA.id, undefined)).toThrow('quantity must be a non-negative integer');
  });

  test('throws when quantity is a float', () => {
    expect(() => updateCartItem('user1', productA.id, 1.5)).toThrow('quantity must be a non-negative integer');
  });

  test('throws when new quantity exceeds stock', () => {
    expect(() => updateCartItem('user1', productA.id, 100)).toThrow('Insufficient stock');
  });
});

describe('removeFromCart', () => {
  test('removes an item from the cart', () => {
    addToCart('user1', productA.id, 2);
    const cart = removeFromCart('user1', productA.id);
    expect(cart.items).toHaveLength(0);
  });

  test('only removes the specified item', () => {
    addToCart('user1', productA.id, 1);
    addToCart('user1', productB.id, 1);
    const cart = removeFromCart('user1', productA.id);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].productId).toBe(productB.id);
  });
});

describe('clearCart', () => {
  test('removes all items from the cart', () => {
    addToCart('user1', productA.id, 2);
    addToCart('user1', productB.id, 1);
    const cart = clearCart('user1');
    expect(cart.items).toHaveLength(0);
  });

  test('throws when cart does not exist', () => {
    expect(() => clearCart('ghost-user')).toThrow('Cart not found');
  });

  test('throws when userId is empty', () => {
    expect(() => clearCart('')).toThrow('userId is required');
  });
});

describe('getCartTotal', () => {
  test('returns 0 for a user with no cart', () => {
    expect(getCartTotal('nobody')).toBe(0);
  });

  test('returns 0 for an empty cart', () => {
    getCart('user1');
    expect(getCartTotal('user1')).toBe(0);
  });

  test('calculates the correct total', () => {
    addToCart('user1', productA.id, 2); // 2 × 10.00 = 20.00
    addToCart('user1', productB.id, 1); // 1 × 5.50 = 5.50
    expect(getCartTotal('user1')).toBe(25.50);
  });

  test('uses priceAtAdd (snapshot) rather than current product price', () => {
    addToCart('user1', productA.id, 1); // priceAtAdd = 10.00
    const { updateProduct } = require('../src/products');
    updateProduct(productA.id, { price: 99.99 }); // change price after adding
    expect(getCartTotal('user1')).toBe(10.00); // should still be 10.00
  });

  test('throws when userId is empty', () => {
    expect(() => getCartTotal('')).toThrow('userId is required');
  });
});
