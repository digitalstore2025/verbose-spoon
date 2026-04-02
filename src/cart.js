'use strict';

const { isNonEmptyString, isNonNegativeInteger } = require('./utils');
const { getProductById } = require('./products');

/**
 * In-memory carts store: { [userId]: { items: [{ productId, quantity, priceAtAdd }], createdAt, updatedAt } }
 */
const _carts = {};

/**
 * Resets the in-memory store (used in tests).
 */
function _reset() {
  for (const key of Object.keys(_carts)) {
    delete _carts[key];
  }
}

/**
 * Returns the cart for a user, creating an empty one if it doesn't exist.
 * @param {string} userId
 * @returns {{ items: object[], createdAt: Date, updatedAt: Date }}
 */
function getCart(userId) {
  if (!isNonEmptyString(userId)) throw new Error('userId is required');
  if (!_carts[userId]) {
    _carts[userId] = { items: [], createdAt: new Date(), updatedAt: new Date() };
  }
  return _deepCopy(_carts[userId]);
}

/**
 * Adds a product to the user's cart (merges quantity if already present).
 * @param {string} userId
 * @param {string} productId
 * @param {number} quantity
 * @returns {object} Updated cart
 */
function addToCart(userId, productId, quantity = 1) {
  if (!isNonEmptyString(userId)) throw new Error('userId is required');
  if (!isNonEmptyString(productId)) throw new Error('productId is required');
  if (!isNonNegativeInteger(quantity) || quantity === 0) {
    throw new Error('quantity must be a positive integer');
  }

  const product = getProductById(productId);
  if (!product) throw new Error(`Product not found: ${productId}`);
  if (!product.active) throw new Error(`Product is not available: ${productId}`);
  if (product.stock < quantity) {
    throw new Error(`Insufficient stock for product ${productId}`);
  }

  if (!_carts[userId]) {
    _carts[userId] = { items: [], createdAt: new Date(), updatedAt: new Date() };
  }

  const cart = _carts[userId];
  const existing = cart.items.find((i) => i.productId === productId);
  if (existing) {
    const newQty = existing.quantity + quantity;
    if (product.stock < newQty) {
      throw new Error(`Insufficient stock for product ${productId}`);
    }
    existing.quantity = newQty;
  } else {
    cart.items.push({ productId, quantity, priceAtAdd: product.price });
  }
  cart.updatedAt = new Date();
  return _deepCopy(cart);
}

/**
 * Updates the quantity of an item in the cart. Removes the item if quantity is 0.
 * @param {string} userId
 * @param {string} productId
 * @param {number} quantity
 * @returns {object} Updated cart
 */
function updateCartItem(userId, productId, quantity) {
  if (!isNonEmptyString(userId)) throw new Error('userId is required');
  if (!isNonEmptyString(productId)) throw new Error('productId is required');
  if (!isNonNegativeInteger(quantity)) throw new Error('quantity must be a non-negative integer');

  const cart = _carts[userId];
  if (!cart) throw new Error(`Cart not found for user: ${userId}`);

  const idx = cart.items.findIndex((i) => i.productId === productId);
  if (idx === -1) throw new Error(`Item not in cart: ${productId}`);

  if (quantity === 0) {
    cart.items.splice(idx, 1);
  } else {
    const product = getProductById(productId);
    if (!product) throw new Error(`Product not found: ${productId}`);
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock for product ${productId}`);
    }
    cart.items[idx].quantity = quantity;
  }
  cart.updatedAt = new Date();
  return _deepCopy(cart);
}

/**
 * Removes an item from the cart entirely.
 * @param {string} userId
 * @param {string} productId
 * @returns {object} Updated cart
 */
function removeFromCart(userId, productId) {
  return updateCartItem(userId, productId, 0);
}

/**
 * Clears all items from the user's cart.
 * @param {string} userId
 * @returns {object} Empty cart
 */
function clearCart(userId) {
  if (!isNonEmptyString(userId)) throw new Error('userId is required');
  const cart = _carts[userId];
  if (!cart) throw new Error(`Cart not found for user: ${userId}`);
  cart.items = [];
  cart.updatedAt = new Date();
  return _deepCopy(cart);
}

/**
 * Calculates the subtotal for the cart using the priceAtAdd values.
 * @param {string} userId
 * @returns {number} Total rounded to 2 decimal places
 */
function getCartTotal(userId) {
  if (!isNonEmptyString(userId)) throw new Error('userId is required');
  const cart = _carts[userId];
  if (!cart) return 0;
  const total = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  return Math.round(total * 100) / 100;
}

function _deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartTotal,
  _reset,
};
