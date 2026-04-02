'use strict';

/**
 * Order processing for the digital store.
 */

const { ValidationError } = require('./product');

class OrderNotFoundError extends Error {
  constructor(id) {
    super(`Order not found: ${id}`);
    this.name = 'OrderNotFoundError';
  }
}

class InvalidOrderStatusTransitionError extends Error {
  constructor(from, to) {
    super(`Cannot transition order from '${from}' to '${to}'`);
    this.name = 'InvalidOrderStatusTransitionError';
  }
}

/**
 * @typedef {'pending'|'paid'|'fulfilled'|'cancelled'|'refunded'} OrderStatus
 * @typedef {Object} OrderItem
 * @property {string} productId
 * @property {string} name
 * @property {number} unitPrice
 * @property {number} quantity
 */

const VALID_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['fulfilled', 'cancelled', 'refunded'],
  fulfilled: ['refunded'],
  cancelled: [],
  refunded: [],
};

let _nextId = 1;
function _generateId() {
  return `ORD-${String(_nextId++).padStart(6, '0')}`;
}

/** @internal - exposed for testing only */
function _resetIdCounter() {
  _nextId = 1;
}

class OrderProcessor {
  constructor() {
    this._orders = new Map();
  }

  /**
   * Creates a new order from cart items.
   * @param {Object} params
   * @param {string} params.userId
   * @param {OrderItem[]} params.items
   * @param {number} [params.discountCents=0]
   * @param {string} [params.couponCode]
   * @returns {Object} created order
   */
  createOrder({ userId, items, discountCents = 0, couponCode }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new ValidationError('userId must be a non-empty string');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Order must contain at least one item');
    }
    for (const item of items) {
      if (!item.productId || typeof item.productId !== 'string') {
        throw new ValidationError('Each order item must have a valid productId');
      }
      if (typeof item.unitPrice !== 'number' || !Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
        throw new ValidationError('Each order item must have a non-negative integer unitPrice');
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new ValidationError('Each order item must have a positive integer quantity');
      }
    }
    if (typeof discountCents !== 'number' || !Number.isInteger(discountCents) || discountCents < 0) {
      throw new ValidationError('discountCents must be a non-negative integer');
    }

    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const total = Math.max(0, subtotal - discountCents);

    const order = {
      id: _generateId(),
      userId: userId.trim(),
      items: items.map(i => ({ ...i })),
      subtotalCents: subtotal,
      discountCents,
      totalCents: total,
      couponCode: couponCode || null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this._orders.set(order.id, order);
    return this._snapshot(order);
  }

  /**
   * Returns an order by id.
   * @param {string} id
   */
  getOrder(id) {
    const order = this._orders.get(id);
    if (!order) throw new OrderNotFoundError(id);
    return this._snapshot(order);
  }

  /**
   * Transitions an order to a new status.
   * @param {string} id
   * @param {OrderStatus} newStatus
   */
  transitionStatus(id, newStatus) {
    const order = this._orders.get(id);
    if (!order) throw new OrderNotFoundError(id);

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed) throw new InvalidOrderStatusTransitionError(order.status, newStatus);
    if (!allowed.includes(newStatus)) {
      throw new InvalidOrderStatusTransitionError(order.status, newStatus);
    }
    order.status = newStatus;
    order.updatedAt = new Date();
    return this._snapshot(order);
  }

  /**
   * Returns all orders for a given user.
   * @param {string} userId
   * @returns {Object[]}
   */
  getOrdersByUser(userId) {
    const results = [];
    for (const o of this._orders.values()) {
      if (o.userId === userId.trim()) results.push(this._snapshot(o));
    }
    return results;
  }

  /**
   * Returns orders filtered by status.
   * @param {OrderStatus} status
   * @returns {Object[]}
   */
  getOrdersByStatus(status) {
    const results = [];
    for (const o of this._orders.values()) {
      if (o.status === status) results.push(this._snapshot(o));
    }
    return results;
  }

  _snapshot(order) {
    return {
      ...order,
      items: order.items.map(i => ({ ...i })),
    };
  }
}

module.exports = { OrderProcessor, OrderNotFoundError, InvalidOrderStatusTransitionError, _resetIdCounter };
