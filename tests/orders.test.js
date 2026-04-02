'use strict';

const { placeOrder, getOrder, listOrdersByUser, updateOrderStatus, STATUS, TAX_RATE, _reset: resetOrders } = require('../src/orders');
const { createProduct, _reset: resetProducts } = require('../src/products');
const { addToCart, _reset: resetCart } = require('../src/cart');

let productA, productB;

beforeEach(() => {
  resetProducts();
  resetCart();
  resetOrders();
  productA = createProduct({ name: 'Alpha', description: 'desc', price: 20.00, category: 'test', stock: 50 });
  productB = createProduct({ name: 'Beta', description: 'desc', price: 5.00, category: 'test', stock: 10 });
});

function setupCartAndOrder(userId = 'user1') {
  addToCart(userId, productA.id, 2); // 2 × 20.00 = 40.00
  addToCart(userId, productB.id, 1); // 1 × 5.00 = 5.00  → subtotal = 45.00
  return placeOrder(userId);
}

describe('placeOrder', () => {
  test('creates an order with the correct structure', () => {
    const order = setupCartAndOrder();
    expect(order.id).toMatch(/^ORD-\d{6}$/);
    expect(order.userId).toBe('user1');
    expect(order.items).toHaveLength(2);
    expect(order.status).toBe(STATUS.PENDING);
  });

  test('calculates subtotal, tax, and total correctly', () => {
    const order = setupCartAndOrder();
    expect(order.subtotal).toBe(45.00);
    expect(order.tax).toBe(Math.round(45.00 * TAX_RATE * 100) / 100);
    expect(order.total).toBe(Math.round((45.00 + order.tax) * 100) / 100);
  });

  test('clears the cart after placing an order', () => {
    setupCartAndOrder();
    const { getCart } = require('../src/cart');
    const cart = getCart('user1');
    expect(cart.items).toHaveLength(0);
  });

  test('decrements product stock', () => {
    setupCartAndOrder(); // reserves 2 of productA and 1 of productB
    const { getProductById } = require('../src/products');
    expect(getProductById(productA.id).stock).toBe(48);
    expect(getProductById(productB.id).stock).toBe(9);
  });

  test('assigns sequential IDs', () => {
    const o1 = setupCartAndOrder('user1');
    addToCart('user2', productA.id, 1);
    const o2 = placeOrder('user2');
    expect(o1.id).toBe('ORD-000001');
    expect(o2.id).toBe('ORD-000002');
  });

  test('throws when cart is empty', () => {
    const { getCart } = require('../src/cart');
    getCart('emptyUser'); // ensure cart exists but is empty
    expect(() => placeOrder('emptyUser')).toThrow('cart is empty');
  });

  test('throws when userId is empty', () => {
    expect(() => placeOrder('')).toThrow('userId is required');
  });

  test('throws when stock is depleted between cart-add and order placement', () => {
    // Both users add the last unit to their carts
    const lowStock = createProduct({ name: 'Low', description: 'd', price: 1, category: 'c', stock: 1 });
    addToCart('user1', lowStock.id, 1);
    addToCart('user2', lowStock.id, 1);
    // user2 places order first, reserving the only unit
    placeOrder('user2');
    // user1 now tries to place order but stock is exhausted
    expect(() => placeOrder('user1')).toThrow('Insufficient stock');
  });
});

describe('getOrder', () => {
  test('returns the order when found', () => {
    const created = setupCartAndOrder();
    const found = getOrder(created.id);
    expect(found.id).toBe(created.id);
  });

  test('returns null for an unknown order ID', () => {
    expect(getOrder('ORD-999999')).toBeNull();
  });

  test('returns a copy (not the same reference)', () => {
    const created = setupCartAndOrder();
    const found = getOrder(created.id);
    found.status = 'tampered';
    expect(getOrder(created.id).status).toBe(STATUS.PENDING);
  });
});

describe('listOrdersByUser', () => {
  test('returns all orders for a user', () => {
    addToCart('user1', productA.id, 1);
    placeOrder('user1');
    addToCart('user1', productB.id, 1);
    placeOrder('user1');
    expect(listOrdersByUser('user1')).toHaveLength(2);
  });

  test('returns an empty array when the user has no orders', () => {
    expect(listOrdersByUser('nobody')).toHaveLength(0);
  });

  test('does not return orders belonging to other users', () => {
    setupCartAndOrder('user1');
    addToCart('user2', productB.id, 1);
    placeOrder('user2');
    expect(listOrdersByUser('user1')).toHaveLength(1);
  });

  test('throws when userId is empty', () => {
    expect(() => listOrdersByUser('')).toThrow('userId is required');
  });
});

describe('updateOrderStatus', () => {
  test('transitions pending → confirmed', () => {
    const order = setupCartAndOrder();
    const updated = updateOrderStatus(order.id, STATUS.CONFIRMED);
    expect(updated.status).toBe(STATUS.CONFIRMED);
  });

  test('transitions confirmed → shipped', () => {
    const order = setupCartAndOrder();
    updateOrderStatus(order.id, STATUS.CONFIRMED);
    const updated = updateOrderStatus(order.id, STATUS.SHIPPED);
    expect(updated.status).toBe(STATUS.SHIPPED);
  });

  test('transitions shipped → delivered', () => {
    const order = setupCartAndOrder();
    updateOrderStatus(order.id, STATUS.CONFIRMED);
    updateOrderStatus(order.id, STATUS.SHIPPED);
    const updated = updateOrderStatus(order.id, STATUS.DELIVERED);
    expect(updated.status).toBe(STATUS.DELIVERED);
  });

  test('transitions pending → cancelled', () => {
    const order = setupCartAndOrder();
    const updated = updateOrderStatus(order.id, STATUS.CANCELLED);
    expect(updated.status).toBe(STATUS.CANCELLED);
  });

  test('transitions confirmed → cancelled', () => {
    const order = setupCartAndOrder();
    updateOrderStatus(order.id, STATUS.CONFIRMED);
    const updated = updateOrderStatus(order.id, STATUS.CANCELLED);
    expect(updated.status).toBe(STATUS.CANCELLED);
  });

  test('throws for an invalid status string', () => {
    const order = setupCartAndOrder();
    expect(() => updateOrderStatus(order.id, 'flying')).toThrow('Invalid status');
  });

  test('throws when trying to reverse a transition (shipped → confirmed)', () => {
    const order = setupCartAndOrder();
    updateOrderStatus(order.id, STATUS.CONFIRMED);
    updateOrderStatus(order.id, STATUS.SHIPPED);
    expect(() => updateOrderStatus(order.id, STATUS.CONFIRMED)).toThrow('Cannot transition');
  });

  test('throws when trying to update a delivered order', () => {
    const order = setupCartAndOrder();
    updateOrderStatus(order.id, STATUS.CONFIRMED);
    updateOrderStatus(order.id, STATUS.SHIPPED);
    updateOrderStatus(order.id, STATUS.DELIVERED);
    expect(() => updateOrderStatus(order.id, STATUS.CANCELLED)).toThrow('Cannot transition');
  });

  test('throws when trying to update a cancelled order', () => {
    const order = setupCartAndOrder();
    updateOrderStatus(order.id, STATUS.CANCELLED);
    expect(() => updateOrderStatus(order.id, STATUS.CONFIRMED)).toThrow('Cannot transition');
  });

  test('throws when order is not found', () => {
    expect(() => updateOrderStatus('ORD-999999', STATUS.CONFIRMED)).toThrow('Order not found');
  });

  test('throws when orderId is empty', () => {
    expect(() => updateOrderStatus('', STATUS.CONFIRMED)).toThrow('orderId is required');
  });
});
