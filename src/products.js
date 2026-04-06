'use strict';

const { isNonEmptyString, isPositiveNumber, isNonNegativeInteger, generateId } = require('./utils');

let _sequence = 0;

/**
 * In-memory product store (array of product objects).
 * Each product: { id, name, description, price, category, stock, active }
 */
const _products = [];

/**
 * Resets the in-memory store (used in tests).
 */
function _reset() {
  _products.length = 0;
  _sequence = 0;
}

/**
 * Creates and stores a new product.
 * @param {{ name: string, description: string, price: number, category: string, stock: number }} data
 * @returns {object} The created product
 */
function createProduct({ name, description, price, category, stock = 0 } = {}) {
  if (!isNonEmptyString(name)) throw new Error('name is required');
  if (!isNonEmptyString(description)) throw new Error('description is required');
  if (!isPositiveNumber(price)) throw new Error('price must be a positive number');
  if (!isNonEmptyString(category)) throw new Error('category is required');
  if (!isNonNegativeInteger(stock)) throw new Error('stock must be a non-negative integer');

  _sequence += 1;
  const product = {
    id: generateId('PRD', _sequence),
    name: name.trim(),
    description: description.trim(),
    price,
    category: category.trim().toLowerCase(),
    stock,
    active: true,
  };
  _products.push(product);
  return { ...product };
}

/**
 * Retrieves a product by its ID.
 * @param {string} id
 * @returns {object|null}
 */
function getProductById(id) {
  const found = _products.find((p) => p.id === id);
  return found ? { ...found } : null;
}

/**
 * Lists all active products, optionally filtered by category.
 * @param {{ category?: string }} [options]
 * @returns {object[]}
 */
function listProducts({ category } = {}) {
  let results = _products.filter((p) => p.active);
  if (category) {
    const cat = category.trim().toLowerCase();
    results = results.filter((p) => p.category === cat);
  }
  return results.map((p) => ({ ...p }));
}

/**
 * Updates an existing product's fields (partial update).
 * @param {string} id
 * @param {{ name?: string, description?: string, price?: number, category?: string, stock?: number, active?: boolean }} updates
 * @returns {object} Updated product
 */
function updateProduct(id, updates = {}) {
  const idx = _products.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Product not found: ${id}`);

  const product = _products[idx];

  if (updates.name !== undefined) {
    if (!isNonEmptyString(updates.name)) throw new Error('name must be a non-empty string');
    product.name = updates.name.trim();
  }
  if (updates.description !== undefined) {
    if (!isNonEmptyString(updates.description)) throw new Error('description must be a non-empty string');
    product.description = updates.description.trim();
  }
  if (updates.price !== undefined) {
    if (!isPositiveNumber(updates.price)) throw new Error('price must be a positive number');
    product.price = updates.price;
  }
  if (updates.category !== undefined) {
    if (!isNonEmptyString(updates.category)) throw new Error('category must be a non-empty string');
    product.category = updates.category.trim().toLowerCase();
  }
  if (updates.stock !== undefined) {
    if (!isNonNegativeInteger(updates.stock)) throw new Error('stock must be a non-negative integer');
    product.stock = updates.stock;
  }
  if (updates.active !== undefined) {
    product.active = Boolean(updates.active);
  }

  return { ...product };
}

/**
 * Soft-deletes (deactivates) a product.
 * @param {string} id
 * @returns {object} Deactivated product
 */
function deleteProduct(id) {
  return updateProduct(id, { active: false });
}

/**
 * Reduces the stock count for a product by a given quantity.
 * Throws if insufficient stock.
 * @param {string} id
 * @param {number} quantity
 * @returns {object} Updated product
 */
function reserveStock(id, quantity) {
  if (!isNonNegativeInteger(quantity) || quantity === 0) {
    throw new Error('quantity must be a positive integer');
  }
  const idx = _products.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Product not found: ${id}`);
  const product = _products[idx];
  if (product.stock < quantity) {
    throw new Error(`Insufficient stock for product ${id}: requested ${quantity}, available ${product.stock}`);
  }
  product.stock -= quantity;
  return { ...product };
}

module.exports = {
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
  deleteProduct,
  reserveStock,
  _reset,
};
