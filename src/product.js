'use strict';

/**
 * Manages the product catalog for the digital store.
 * Products represent downloadable/digital goods (software, ebooks, media, etc.).
 */

class ProductNotFoundError extends Error {
  constructor(id) {
    super(`Product not found: ${id}`);
    this.name = 'ProductNotFoundError';
  }
}

class DuplicateProductError extends Error {
  constructor(id) {
    super(`Product already exists: ${id}`);
    this.name = 'DuplicateProductError';
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {number} price        - Price in cents (integer)
 * @property {number} stock        - Available licenses / download slots (-1 = unlimited)
 * @property {boolean} active
 * @property {string[]} tags
 */

function validateProduct(data) {
  if (!data.id || typeof data.id !== 'string' || data.id.trim() === '') {
    throw new ValidationError('Product id must be a non-empty string');
  }
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    throw new ValidationError('Product name must be a non-empty string');
  }
  if (!data.category || typeof data.category !== 'string') {
    throw new ValidationError('Product category must be a non-empty string');
  }
  if (typeof data.price !== 'number' || !Number.isInteger(data.price) || data.price < 0) {
    throw new ValidationError('Product price must be a non-negative integer (cents)');
  }
  if (typeof data.stock !== 'number' || !Number.isInteger(data.stock) || (data.stock < -1)) {
    throw new ValidationError('Product stock must be -1 (unlimited) or a non-negative integer');
  }
}

class ProductCatalog {
  constructor() {
    this._products = new Map();
  }

  /**
   * Adds a new product to the catalog.
   * @param {Object} data
   * @returns {Product}
   */
  addProduct(data) {
    validateProduct(data);
    if (this._products.has(data.id)) {
      throw new DuplicateProductError(data.id);
    }
    const product = {
      id: data.id.trim(),
      name: data.name.trim(),
      category: data.category.trim(),
      price: data.price,
      stock: data.stock,
      active: data.active !== false,
      tags: Array.isArray(data.tags) ? [...data.tags] : [],
    };
    this._products.set(product.id, product);
    return { ...product };
  }

  /**
   * Returns a product by id.
   * @param {string} id
   * @returns {Product}
   */
  getProduct(id) {
    const product = this._products.get(id);
    if (!product) throw new ProductNotFoundError(id);
    return { ...product };
  }

  /**
   * Updates mutable fields on an existing product.
   * @param {string} id
   * @param {Partial<Product>} updates
   * @returns {Product}
   */
  updateProduct(id, updates) {
    const product = this._products.get(id);
    if (!product) throw new ProductNotFoundError(id);

    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.trim() === '') {
        throw new ValidationError('Product name must be a non-empty string');
      }
      product.name = updates.name.trim();
    }
    if (updates.price !== undefined) {
      if (typeof updates.price !== 'number' || !Number.isInteger(updates.price) || updates.price < 0) {
        throw new ValidationError('Product price must be a non-negative integer (cents)');
      }
      product.price = updates.price;
    }
    if (updates.stock !== undefined) {
      if (typeof updates.stock !== 'number' || !Number.isInteger(updates.stock) || updates.stock < -1) {
        throw new ValidationError('Product stock must be -1 (unlimited) or a non-negative integer');
      }
      product.stock = updates.stock;
    }
    if (updates.active !== undefined) {
      product.active = Boolean(updates.active);
    }
    if (updates.tags !== undefined) {
      if (!Array.isArray(updates.tags)) {
        throw new ValidationError('Product tags must be an array');
      }
      product.tags = [...updates.tags];
    }
    if (updates.category !== undefined) {
      if (typeof updates.category !== 'string' || updates.category.trim() === '') {
        throw new ValidationError('Product category must be a non-empty string');
      }
      product.category = updates.category.trim();
    }
    return { ...product };
  }

  /**
   * Removes a product from the catalog.
   * @param {string} id
   */
  removeProduct(id) {
    if (!this._products.has(id)) throw new ProductNotFoundError(id);
    this._products.delete(id);
  }

  /**
   * Returns all active products, optionally filtered by category.
   * @param {string} [category]
   * @returns {Product[]}
   */
  listProducts(category) {
    const results = [];
    for (const p of this._products.values()) {
      if (!p.active) continue;
      if (category && p.category !== category) continue;
      results.push({ ...p });
    }
    return results;
  }

  /**
   * Returns products matching all provided tags.
   * @param {string[]} tags
   * @returns {Product[]}
   */
  searchByTags(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return [];
    const results = [];
    for (const p of this._products.values()) {
      if (!p.active) continue;
      if (tags.every(tag => p.tags.includes(tag))) {
        results.push({ ...p });
      }
    }
    return results;
  }

  /**
   * Decrements stock by the given quantity. Throws if insufficient.
   * @param {string} id
   * @param {number} qty
   */
  reserveStock(id, qty) {
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ValidationError('Quantity must be a positive integer');
    }
    const product = this._products.get(id);
    if (!product) throw new ProductNotFoundError(id);
    if (!product.active) throw new ValidationError(`Product ${id} is not active`);
    if (product.stock !== -1) {
      if (product.stock < qty) {
        throw new ValidationError(`Insufficient stock for product ${id}: available ${product.stock}, requested ${qty}`);
      }
      product.stock -= qty;
    }
  }

  /**
   * Returns current number of tracked products.
   */
  get size() {
    return this._products.size;
  }
}

module.exports = { ProductCatalog, ProductNotFoundError, DuplicateProductError, ValidationError };
