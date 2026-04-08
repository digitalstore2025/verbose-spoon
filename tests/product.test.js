'use strict';

const { ProductCatalog, ProductNotFoundError, DuplicateProductError, ValidationError } = require('../src/product');

function makeValidData(overrides = {}) {
  return {
    id: 'prod-1',
    name: 'Test Product',
    category: 'software',
    price: 1999,
    stock: 10,
    ...overrides,
  };
}

describe('ProductCatalog', () => {
  let catalog;

  beforeEach(() => {
    catalog = new ProductCatalog();
  });

  // ───────────────────────── addProduct ─────────────────────────

  describe('addProduct', () => {
    test('adds a valid product and returns a snapshot', () => {
      const p = catalog.addProduct(makeValidData({ tags: ['popular', 'new'] }));
      expect(p.id).toBe('prod-1');
      expect(p.name).toBe('Test Product');
      expect(p.category).toBe('software');
      expect(p.price).toBe(1999);
      expect(p.stock).toBe(10);
      expect(p.active).toBe(true);
      expect(p.tags).toEqual(['popular', 'new']);
    });

    test('trims whitespace from id, name, and category', () => {
      const p = catalog.addProduct(makeValidData({ id: '  prod-trim  ', name: '  My Product  ', category: '  games  ' }));
      expect(p.id).toBe('prod-trim');
      expect(p.name).toBe('My Product');
      expect(p.category).toBe('games');
    });

    test('defaults active to true when not provided', () => {
      const p = catalog.addProduct(makeValidData());
      expect(p.active).toBe(true);
    });

    test('respects explicit active: false', () => {
      const p = catalog.addProduct(makeValidData({ active: false }));
      expect(p.active).toBe(false);
    });

    test('allows unlimited stock (-1)', () => {
      const p = catalog.addProduct(makeValidData({ stock: -1 }));
      expect(p.stock).toBe(-1);
    });

    test('allows free products (price = 0)', () => {
      const p = catalog.addProduct(makeValidData({ price: 0 }));
      expect(p.price).toBe(0);
    });

    test('defaults tags to [] when not provided', () => {
      const p = catalog.addProduct(makeValidData());
      expect(p.tags).toEqual([]);
    });

    test('returns a copy – mutation of returned object does not affect catalog', () => {
      const p = catalog.addProduct(makeValidData());
      p.price = 9999;
      expect(catalog.getProduct('prod-1').price).toBe(1999);
    });

    test('increments size', () => {
      expect(catalog.size).toBe(0);
      catalog.addProduct(makeValidData({ id: 'p1' }));
      catalog.addProduct(makeValidData({ id: 'p2' }));
      expect(catalog.size).toBe(2);
    });

    test('throws DuplicateProductError for duplicate id', () => {
      catalog.addProduct(makeValidData());
      expect(() => catalog.addProduct(makeValidData())).toThrow(DuplicateProductError);
    });

    test.each([
      ['empty id', { id: '' }],
      ['whitespace id', { id: '   ' }],
      ['missing name', { name: '' }],
      ['missing category', { category: '' }],
      ['negative price', { price: -1 }],
      ['float price', { price: 1.5 }],
      ['string price', { price: '10' }],
      ['stock below -1', { stock: -2 }],
      ['float stock', { stock: 0.5 }],
    ])('throws ValidationError for %s', (_, override) => {
      expect(() => catalog.addProduct(makeValidData(override))).toThrow(ValidationError);
    });
  });

  // ───────────────────────── getProduct ─────────────────────────

  describe('getProduct', () => {
    test('returns a product that was added', () => {
      catalog.addProduct(makeValidData());
      const p = catalog.getProduct('prod-1');
      expect(p.id).toBe('prod-1');
    });

    test('throws ProductNotFoundError for unknown id', () => {
      expect(() => catalog.getProduct('no-such')).toThrow(ProductNotFoundError);
    });

    test('returns a copy – mutation does not affect catalog', () => {
      catalog.addProduct(makeValidData());
      const p = catalog.getProduct('prod-1');
      p.price = 0;
      expect(catalog.getProduct('prod-1').price).toBe(1999);
    });
  });

  // ───────────────────────── updateProduct ─────────────────────────

  describe('updateProduct', () => {
    beforeEach(() => catalog.addProduct(makeValidData()));

    test('updates name', () => {
      const p = catalog.updateProduct('prod-1', { name: 'New Name' });
      expect(p.name).toBe('New Name');
    });

    test('updates price', () => {
      const p = catalog.updateProduct('prod-1', { price: 2999 });
      expect(p.price).toBe(2999);
    });

    test('updates stock', () => {
      const p = catalog.updateProduct('prod-1', { stock: 50 });
      expect(p.stock).toBe(50);
    });

    test('updates active flag', () => {
      const p = catalog.updateProduct('prod-1', { active: false });
      expect(p.active).toBe(false);
    });

    test('updates tags', () => {
      const p = catalog.updateProduct('prod-1', { tags: ['promo'] });
      expect(p.tags).toEqual(['promo']);
    });

    test('updates category', () => {
      const p = catalog.updateProduct('prod-1', { category: 'ebooks' });
      expect(p.category).toBe('ebooks');
    });

    test('can update multiple fields at once', () => {
      const p = catalog.updateProduct('prod-1', { name: 'X', price: 500 });
      expect(p.name).toBe('X');
      expect(p.price).toBe(500);
    });

    test('throws ProductNotFoundError for unknown id', () => {
      expect(() => catalog.updateProduct('ghost', { price: 1 })).toThrow(ProductNotFoundError);
    });

    test.each([
      ['empty name', { name: '' }],
      ['negative price', { price: -5 }],
      ['float price', { price: 2.2 }],
      ['stock below -1', { stock: -5 }],
      ['non-array tags', { tags: 'foo' }],
      ['empty category', { category: '' }],
    ])('throws ValidationError for %s', (_, updates) => {
      expect(() => catalog.updateProduct('prod-1', updates)).toThrow(ValidationError);
    });
  });

  // ───────────────────────── removeProduct ─────────────────────────

  describe('removeProduct', () => {
    test('removes an existing product', () => {
      catalog.addProduct(makeValidData());
      catalog.removeProduct('prod-1');
      expect(catalog.size).toBe(0);
      expect(() => catalog.getProduct('prod-1')).toThrow(ProductNotFoundError);
    });

    test('throws ProductNotFoundError for unknown id', () => {
      expect(() => catalog.removeProduct('ghost')).toThrow(ProductNotFoundError);
    });
  });

  // ───────────────────────── listProducts ─────────────────────────

  describe('listProducts', () => {
    beforeEach(() => {
      catalog.addProduct(makeValidData({ id: 'p1', category: 'software' }));
      catalog.addProduct(makeValidData({ id: 'p2', category: 'ebooks' }));
      catalog.addProduct(makeValidData({ id: 'p3', category: 'software', active: false }));
    });

    test('returns only active products when no filter', () => {
      const list = catalog.listProducts();
      expect(list.map(p => p.id)).toEqual(expect.arrayContaining(['p1', 'p2']));
      expect(list.some(p => p.id === 'p3')).toBe(false);
    });

    test('filters by category', () => {
      const list = catalog.listProducts('software');
      expect(list.every(p => p.category === 'software')).toBe(true);
      expect(list.length).toBe(1); // p3 is inactive
    });

    test('returns empty array when no active products match category', () => {
      expect(catalog.listProducts('music')).toEqual([]);
    });

    test('returns empty array when catalog is empty', () => {
      expect(new ProductCatalog().listProducts()).toEqual([]);
    });
  });

  // ───────────────────────── searchByTags ─────────────────────────

  describe('searchByTags', () => {
    beforeEach(() => {
      catalog.addProduct(makeValidData({ id: 'p1', tags: ['promo', 'new'] }));
      catalog.addProduct(makeValidData({ id: 'p2', tags: ['promo'] }));
      catalog.addProduct(makeValidData({ id: 'p3', tags: ['new'], active: false }));
    });

    test('returns products matching all tags', () => {
      const list = catalog.searchByTags(['promo', 'new']);
      expect(list.map(p => p.id)).toEqual(['p1']);
    });

    test('returns products matching a single tag', () => {
      const list = catalog.searchByTags(['promo']);
      expect(list.map(p => p.id)).toEqual(expect.arrayContaining(['p1', 'p2']));
    });

    test('excludes inactive products', () => {
      const list = catalog.searchByTags(['new']);
      expect(list.some(p => p.id === 'p3')).toBe(false);
    });

    test('returns empty array for empty tags array', () => {
      expect(catalog.searchByTags([])).toEqual([]);
    });

    test('returns empty array for non-array argument', () => {
      expect(catalog.searchByTags('promo')).toEqual([]);
    });
  });

  // ───────────────────────── reserveStock ─────────────────────────

  describe('reserveStock', () => {
    test('decrements finite stock', () => {
      catalog.addProduct(makeValidData({ stock: 5 }));
      catalog.reserveStock('prod-1', 3);
      expect(catalog.getProduct('prod-1').stock).toBe(2);
    });

    test('does not change stock when stock is unlimited (-1)', () => {
      catalog.addProduct(makeValidData({ stock: -1 }));
      catalog.reserveStock('prod-1', 100);
      expect(catalog.getProduct('prod-1').stock).toBe(-1);
    });

    test('throws ValidationError when insufficient stock', () => {
      catalog.addProduct(makeValidData({ stock: 2 }));
      expect(() => catalog.reserveStock('prod-1', 5)).toThrow(ValidationError);
    });

    test('throws ValidationError when product is not active', () => {
      catalog.addProduct(makeValidData({ stock: 10, active: false }));
      expect(() => catalog.reserveStock('prod-1', 1)).toThrow(ValidationError);
    });

    test('throws ValidationError for zero quantity', () => {
      catalog.addProduct(makeValidData());
      expect(() => catalog.reserveStock('prod-1', 0)).toThrow(ValidationError);
    });

    test('throws ValidationError for negative quantity', () => {
      catalog.addProduct(makeValidData());
      expect(() => catalog.reserveStock('prod-1', -1)).toThrow(ValidationError);
    });

    test('throws ProductNotFoundError for unknown product', () => {
      expect(() => catalog.reserveStock('ghost', 1)).toThrow(ProductNotFoundError);
    });

    test('allows buying the last available unit', () => {
      catalog.addProduct(makeValidData({ stock: 1 }));
      catalog.reserveStock('prod-1', 1);
      expect(catalog.getProduct('prod-1').stock).toBe(0);
    });
  });

  // ───────────────────────── error names ─────────────────────────

  describe('error classes', () => {
    test('ProductNotFoundError has correct name', () => {
      expect(new ProductNotFoundError('x').name).toBe('ProductNotFoundError');
    });
    test('DuplicateProductError has correct name', () => {
      expect(new DuplicateProductError('x').name).toBe('DuplicateProductError');
    });
    test('ValidationError has correct name', () => {
      expect(new ValidationError('x').name).toBe('ValidationError');
    });
  });
});
