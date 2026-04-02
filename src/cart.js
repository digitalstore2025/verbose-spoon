'use strict';

/**
 * Shopping cart logic for the digital store.
 * A Cart belongs to a single user session and holds line items.
 */

const { ValidationError } = require('./product');

class CartItemNotFoundError extends Error {
  constructor(productId) {
    super(`Cart item not found for product: ${productId}`);
    this.name = 'CartItemNotFoundError';
  }
}

/**
 * @typedef {Object} CartItem
 * @property {string} productId
 * @property {string} name
 * @property {number} unitPrice   - Price in cents
 * @property {number} quantity
 */

class Cart {
  /**
   * @param {string} userId
   */
  constructor(userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new ValidationError('userId must be a non-empty string');
    }
    this.userId = userId.trim();
    this._items = new Map(); // productId -> CartItem
    this.createdAt = new Date();
  }

  /**
   * Adds or increments a product in the cart.
   * @param {Object} params
   * @param {string} params.productId
   * @param {string} params.name
   * @param {number} params.unitPrice
   * @param {number} [params.quantity=1]
   */
  addItem({ productId, name, unitPrice, quantity = 1 }) {
    if (!productId || typeof productId !== 'string') {
      throw new ValidationError('productId must be a non-empty string');
    }
    if (!name || typeof name !== 'string') {
      throw new ValidationError('name must be a non-empty string');
    }
    if (typeof unitPrice !== 'number' || !Number.isInteger(unitPrice) || unitPrice < 0) {
      throw new ValidationError('unitPrice must be a non-negative integer (cents)');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ValidationError('quantity must be a positive integer');
    }

    if (this._items.has(productId)) {
      this._items.get(productId).quantity += quantity;
    } else {
      this._items.set(productId, { productId, name, unitPrice, quantity });
    }
  }

  /**
   * Sets the quantity of an existing cart item. Pass 0 to remove.
   * @param {string} productId
   * @param {number} quantity
   */
  setQuantity(productId, quantity) {
    if (!this._items.has(productId)) throw new CartItemNotFoundError(productId);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new ValidationError('quantity must be a non-negative integer');
    }
    if (quantity === 0) {
      this._items.delete(productId);
    } else {
      this._items.get(productId).quantity = quantity;
    }
  }

  /**
   * Removes a product entirely from the cart.
   * @param {string} productId
   */
  removeItem(productId) {
    if (!this._items.has(productId)) throw new CartItemNotFoundError(productId);
    this._items.delete(productId);
  }

  /**
   * Returns a copy of all cart items.
   * @returns {CartItem[]}
   */
  getItems() {
    return Array.from(this._items.values()).map(item => ({ ...item }));
  }

  /**
   * Returns the subtotal (sum of unitPrice * quantity) in cents.
   * @returns {number}
   */
  getSubtotal() {
    let total = 0;
    for (const item of this._items.values()) {
      total += item.unitPrice * item.quantity;
    }
    return total;
  }

  /**
   * Returns the number of distinct products in the cart.
   */
  get itemCount() {
    return this._items.size;
  }

  /**
   * Returns the total number of units across all items.
   */
  get totalUnits() {
    let count = 0;
    for (const item of this._items.values()) count += item.quantity;
    return count;
  }

  /**
   * Clears all items from the cart.
   */
  clear() {
    this._items.clear();
  }

  /**
   * Returns true if the cart contains no items.
   */
  get isEmpty() {
    return this._items.size === 0;
  }
}

module.exports = { Cart, CartItemNotFoundError };
