'use strict';

const { isNonEmptyString, isNonNegativeInteger, generateId } = require('./utils');
const { getCart, getCartTotal, clearCart } = require('./cart');
const { reserveStock } = require('./products');

let _sequence = 0;

/**
 * In-memory orders store: { [orderId]: order }
 * Order shape: { id, userId, items, subtotal, tax, total, status, createdAt, updatedAt }
 */
const _orders = {};

const TAX_RATE = 0.08; // 8%

/** Order status values */
const STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

/**
 * Resets the in-memory store (used in tests).
 */
function _reset() {
  for (const key of Object.keys(_orders)) {
    delete _orders[key];
  }
  _sequence = 0;
}

/**
 * Places a new order from a user's cart contents.
 * Reserves stock for each item and clears the cart on success.
 * @param {string} userId
 * @returns {object} The created order
 */
function placeOrder(userId) {
  if (!isNonEmptyString(userId)) throw new Error('userId is required');

  const cart = getCart(userId);
  if (cart.items.length === 0) throw new Error('Cannot place order: cart is empty');

  // Reserve stock for every item (all-or-nothing: if any fails, throw)
  const reserved = [];
  try {
    for (const item of cart.items) {
      reserveStock(item.productId, item.quantity);
      reserved.push(item);
    }
  } catch (err) {
    // No rollback of stock in this simple model — caller must handle
    throw err;
  }

  const subtotal = getCartTotal(userId);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  _sequence += 1;
  const order = {
    id: generateId('ORD', _sequence),
    userId,
    items: cart.items.map((i) => ({ ...i })),
    subtotal,
    tax,
    total,
    status: STATUS.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  _orders[order.id] = order;
  clearCart(userId);

  return { ...order, items: order.items.map((i) => ({ ...i })) };
}

/**
 * Returns an order by ID.
 * @param {string} orderId
 * @returns {object|null}
 */
function getOrder(orderId) {
  const order = _orders[orderId];
  if (!order) return null;
  return { ...order, items: order.items.map((i) => ({ ...i })) };
}

/**
 * Lists all orders for a given user.
 * @param {string} userId
 * @returns {object[]}
 */
function listOrdersByUser(userId) {
  if (!isNonEmptyString(userId)) throw new Error('userId is required');
  return Object.values(_orders)
    .filter((o) => o.userId === userId)
    .map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) }));
}

/**
 * Advances an order's status.
 * Allowed transitions: pending → confirmed → shipped → delivered
 *                      pending/confirmed → cancelled
 * @param {string} orderId
 * @param {string} newStatus  One of STATUS values
 * @returns {object} Updated order
 */
function updateOrderStatus(orderId, newStatus) {
  if (!isNonEmptyString(orderId)) throw new Error('orderId is required');
  if (!Object.values(STATUS).includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const order = _orders[orderId];
  if (!order) throw new Error(`Order not found: ${orderId}`);

  const allowedTransitions = {
    [STATUS.PENDING]: [STATUS.CONFIRMED, STATUS.CANCELLED],
    [STATUS.CONFIRMED]: [STATUS.SHIPPED, STATUS.CANCELLED],
    [STATUS.SHIPPED]: [STATUS.DELIVERED],
    [STATUS.DELIVERED]: [],
    [STATUS.CANCELLED]: [],
  };

  const allowed = allowedTransitions[order.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition order from '${order.status}' to '${newStatus}'`);
  }

  order.status = newStatus;
  order.updatedAt = new Date().toISOString();
  return { ...order, items: order.items.map((i) => ({ ...i })) };
}

module.exports = {
  placeOrder,
  getOrder,
  listOrdersByUser,
  updateOrderStatus,
  STATUS,
  TAX_RATE,
  _reset,
};
