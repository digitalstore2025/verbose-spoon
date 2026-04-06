'use strict';

const {
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
  deleteProduct,
  reserveStock,
  _reset,
} = require('../src/products');

beforeEach(() => {
  _reset();
});

describe('createProduct', () => {
  test('creates a product with all required fields', () => {
    const p = createProduct({
      name: 'Widget',
      description: 'A nice widget',
      price: 9.99,
      category: 'Gadgets',
      stock: 50,
    });
    expect(p.id).toMatch(/^PRD-\d{6}$/);
    expect(p.name).toBe('Widget');
    expect(p.description).toBe('A nice widget');
    expect(p.price).toBe(9.99);
    expect(p.category).toBe('gadgets');
    expect(p.stock).toBe(50);
    expect(p.active).toBe(true);
  });

  test('creates a product with default stock of 0', () => {
    const p = createProduct({ name: 'X', description: 'desc', price: 1, category: 'cat' });
    expect(p.stock).toBe(0);
  });

  test('trims whitespace from name and description', () => {
    const p = createProduct({ name: '  Trimmed  ', description: '  desc  ', price: 1, category: 'cat' });
    expect(p.name).toBe('Trimmed');
    expect(p.description).toBe('desc');
  });

  test('stores category in lowercase', () => {
    const p = createProduct({ name: 'X', description: 'd', price: 1, category: 'Electronics' });
    expect(p.category).toBe('electronics');
  });

  test('assigns sequential IDs', () => {
    const p1 = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    const p2 = createProduct({ name: 'B', description: 'd', price: 2, category: 'c' });
    expect(p1.id).toBe('PRD-000001');
    expect(p2.id).toBe('PRD-000002');
  });

  test('throws when name is missing', () => {
    expect(() => createProduct({ description: 'd', price: 1, category: 'c' })).toThrow('name is required');
  });

  test('throws when name is empty string', () => {
    expect(() => createProduct({ name: '', description: 'd', price: 1, category: 'c' })).toThrow('name is required');
  });

  test('throws when description is missing', () => {
    expect(() => createProduct({ name: 'A', price: 1, category: 'c' })).toThrow('description is required');
  });

  test('throws when price is zero', () => {
    expect(() => createProduct({ name: 'A', description: 'd', price: 0, category: 'c' })).toThrow(
      'price must be a positive number'
    );
  });

  test('throws when price is negative', () => {
    expect(() => createProduct({ name: 'A', description: 'd', price: -5, category: 'c' })).toThrow(
      'price must be a positive number'
    );
  });

  test('throws when category is missing', () => {
    expect(() => createProduct({ name: 'A', description: 'd', price: 1 })).toThrow('category is required');
  });

  test('throws when stock is a float', () => {
    expect(() => createProduct({ name: 'A', description: 'd', price: 1, category: 'c', stock: 1.5 })).toThrow(
      'stock must be a non-negative integer'
    );
  });

  test('throws when stock is negative', () => {
    expect(() => createProduct({ name: 'A', description: 'd', price: 1, category: 'c', stock: -1 })).toThrow(
      'stock must be a non-negative integer'
    );
  });

  test('throws when called with no arguments', () => {
    expect(() => createProduct()).toThrow();
  });
});

describe('getProductById', () => {
  test('returns the product when found', () => {
    const created = createProduct({ name: 'A', description: 'd', price: 5, category: 'c' });
    const found = getProductById(created.id);
    expect(found).toEqual(created);
  });

  test('returns null when not found', () => {
    expect(getProductById('PRD-999999')).toBeNull();
  });

  test('returns a copy (not the same reference)', () => {
    const created = createProduct({ name: 'A', description: 'd', price: 5, category: 'c' });
    const found = getProductById(created.id);
    found.name = 'Modified';
    expect(getProductById(created.id).name).toBe('A');
  });
});

describe('listProducts', () => {
  test('returns all active products', () => {
    createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    createProduct({ name: 'B', description: 'd', price: 2, category: 'c' });
    expect(listProducts()).toHaveLength(2);
  });

  test('excludes inactive products', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    deleteProduct(p.id);
    expect(listProducts()).toHaveLength(0);
  });

  test('filters by category', () => {
    createProduct({ name: 'A', description: 'd', price: 1, category: 'gadgets' });
    createProduct({ name: 'B', description: 'd', price: 2, category: 'clothing' });
    const results = listProducts({ category: 'gadgets' });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('A');
  });

  test('filters by category case-insensitively', () => {
    createProduct({ name: 'A', description: 'd', price: 1, category: 'gadgets' });
    expect(listProducts({ category: 'GADGETS' })).toHaveLength(1);
  });

  test('returns empty array when no products match', () => {
    createProduct({ name: 'A', description: 'd', price: 1, category: 'gadgets' });
    expect(listProducts({ category: 'clothing' })).toHaveLength(0);
  });

  test('returns empty array when store is empty', () => {
    expect(listProducts()).toHaveLength(0);
  });
});

describe('updateProduct', () => {
  test('updates the product name', () => {
    const p = createProduct({ name: 'Old', description: 'd', price: 1, category: 'c' });
    const updated = updateProduct(p.id, { name: 'New' });
    expect(updated.name).toBe('New');
  });

  test('updates the product price', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    const updated = updateProduct(p.id, { price: 19.99 });
    expect(updated.price).toBe(19.99);
  });

  test('updates the stock', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c', stock: 5 });
    const updated = updateProduct(p.id, { stock: 100 });
    expect(updated.stock).toBe(100);
  });

  test('updates the active flag', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    const updated = updateProduct(p.id, { active: false });
    expect(updated.active).toBe(false);
  });

  test('does not modify unspecified fields', () => {
    const p = createProduct({ name: 'A', description: 'Original desc', price: 5, category: 'c' });
    const updated = updateProduct(p.id, { name: 'B' });
    expect(updated.description).toBe('Original desc');
    expect(updated.price).toBe(5);
  });

  test('updates the product description', () => {
    const p = createProduct({ name: 'A', description: 'Old desc', price: 1, category: 'c' });
    const updated = updateProduct(p.id, { description: 'New desc' });
    expect(updated.description).toBe('New desc');
  });

  test('throws when updating description to empty string', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    expect(() => updateProduct(p.id, { description: '' })).toThrow('description must be a non-empty string');
  });

  test('updates the product category', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'old' });
    const updated = updateProduct(p.id, { category: 'New Category' });
    expect(updated.category).toBe('new category');
  });

  test('throws when updating category to empty string', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    expect(() => updateProduct(p.id, { category: '' })).toThrow('category must be a non-empty string');
  });



  test('throws when updating name to empty string', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    expect(() => updateProduct(p.id, { name: '' })).toThrow('name must be a non-empty string');
  });

  test('throws when updating price to zero', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    expect(() => updateProduct(p.id, { price: 0 })).toThrow('price must be a positive number');
  });

  test('throws when updating stock to a negative value', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    expect(() => updateProduct(p.id, { stock: -3 })).toThrow('stock must be a non-negative integer');
  });

  test('returns product unchanged when called with no updates argument', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    const result = updateProduct(p.id);
    expect(result).toEqual(p);
  });
});

describe('deleteProduct', () => {
  test('deactivates the product', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    const deleted = deleteProduct(p.id);
    expect(deleted.active).toBe(false);
  });

  test('product is no longer returned by listProducts', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c' });
    deleteProduct(p.id);
    expect(listProducts()).toHaveLength(0);
  });

  test('throws when product not found', () => {
    expect(() => deleteProduct('PRD-000099')).toThrow('Product not found');
  });
});

describe('reserveStock', () => {
  test('decrements stock by the requested quantity', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c', stock: 10 });
    const updated = reserveStock(p.id, 3);
    expect(updated.stock).toBe(7);
  });

  test('allows reserving exact remaining stock', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c', stock: 5 });
    const updated = reserveStock(p.id, 5);
    expect(updated.stock).toBe(0);
  });

  test('throws when quantity exceeds available stock', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c', stock: 2 });
    expect(() => reserveStock(p.id, 3)).toThrow('Insufficient stock');
  });

  test('throws when product not found', () => {
    expect(() => reserveStock('PRD-000099', 1)).toThrow('Product not found');
  });

  test('throws when quantity is zero', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c', stock: 10 });
    expect(() => reserveStock(p.id, 0)).toThrow('quantity must be a positive integer');
  });

  test('throws when quantity is a float', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c', stock: 10 });
    expect(() => reserveStock(p.id, 1.5)).toThrow('quantity must be a positive integer');
  });

  test('throws when quantity is negative', () => {
    const p = createProduct({ name: 'A', description: 'd', price: 1, category: 'c', stock: 10 });
    expect(() => reserveStock(p.id, -1)).toThrow('quantity must be a positive integer');
  });
});
