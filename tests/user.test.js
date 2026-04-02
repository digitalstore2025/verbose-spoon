'use strict';

const { UserManager, UserNotFoundError, DuplicateEmailError, _resetUserIdCounter } = require('../src/user');
const { ValidationError } = require('../src/product');

describe('UserManager', () => {
  let mgr;

  beforeEach(() => {
    _resetUserIdCounter();
    mgr = new UserManager();
  });

  // ───────────────────────── register ─────────────────────────

  describe('register', () => {
    test('registers a user and returns a snapshot', () => {
      const u = mgr.register({ email: 'alice@example.com', displayName: 'Alice' });
      expect(u.id).toBe('USR-000001');
      expect(u.email).toBe('alice@example.com');
      expect(u.displayName).toBe('Alice');
      expect(u.role).toBe('customer');
      expect(u.active).toBe(true);
      expect(u.createdAt).toBeInstanceOf(Date);
    });

    test('normalises email to lowercase', () => {
      const u = mgr.register({ email: 'Alice@EXAMPLE.COM', displayName: 'Alice' });
      expect(u.email).toBe('alice@example.com');
    });

    test('trims displayName', () => {
      const u = mgr.register({ email: 'a@b.com', displayName: '  Bob  ' });
      expect(u.displayName).toBe('Bob');
    });

    test('assigns admin role when requested', () => {
      const u = mgr.register({ email: 'a@b.com', displayName: 'Admin', role: 'admin' });
      expect(u.role).toBe('admin');
    });

    test('defaults to customer role for unknown roles', () => {
      const u = mgr.register({ email: 'a@b.com', displayName: 'X', role: 'superuser' });
      expect(u.role).toBe('customer');
    });

    test('generates sequential ids', () => {
      const u1 = mgr.register({ email: 'a@b.com', displayName: 'A' });
      const u2 = mgr.register({ email: 'c@d.com', displayName: 'B' });
      expect(u1.id).toBe('USR-000001');
      expect(u2.id).toBe('USR-000002');
    });

    test('throws DuplicateEmailError for same email', () => {
      mgr.register({ email: 'a@b.com', displayName: 'A' });
      expect(() => mgr.register({ email: 'a@b.com', displayName: 'B' })).toThrow(DuplicateEmailError);
    });

    test('duplicate check is case-insensitive', () => {
      mgr.register({ email: 'a@b.com', displayName: 'A' });
      expect(() => mgr.register({ email: 'A@B.COM', displayName: 'B' })).toThrow(DuplicateEmailError);
    });

    test.each([
      ['missing @', { email: 'notanemail' }],
      ['empty email', { email: '' }],
      ['null email', { email: null }],
      ['empty displayName', { displayName: '' }],
      ['whitespace displayName', { displayName: '   ' }],
    ])('throws ValidationError for %s', (_, override) => {
      const base = { email: 'a@b.com', displayName: 'Alice' };
      expect(() => mgr.register({ ...base, ...override })).toThrow(ValidationError);
    });

    test('returns a copy – mutation does not affect manager', () => {
      const u = mgr.register({ email: 'a@b.com', displayName: 'Alice' });
      u.displayName = 'Hacked';
      expect(mgr.getUserById(u.id).displayName).toBe('Alice');
    });
  });

  // ───────────────────────── getUserById ─────────────────────────

  describe('getUserById', () => {
    test('returns the registered user', () => {
      const u = mgr.register({ email: 'a@b.com', displayName: 'Alice' });
      expect(mgr.getUserById(u.id).email).toBe('a@b.com');
    });

    test('throws UserNotFoundError for unknown id', () => {
      expect(() => mgr.getUserById('USR-999999')).toThrow(UserNotFoundError);
    });
  });

  // ───────────────────────── getUserByEmail ─────────────────────────

  describe('getUserByEmail', () => {
    test('retrieves user by exact email', () => {
      mgr.register({ email: 'alice@example.com', displayName: 'Alice' });
      const u = mgr.getUserByEmail('alice@example.com');
      expect(u.displayName).toBe('Alice');
    });

    test('is case-insensitive', () => {
      mgr.register({ email: 'alice@example.com', displayName: 'Alice' });
      const u = mgr.getUserByEmail('ALICE@EXAMPLE.COM');
      expect(u.displayName).toBe('Alice');
    });

    test('throws UserNotFoundError for unknown email', () => {
      expect(() => mgr.getUserByEmail('nobody@example.com')).toThrow(UserNotFoundError);
    });

    test('throws ValidationError for malformed email', () => {
      expect(() => mgr.getUserByEmail('notanemail')).toThrow(ValidationError);
    });
  });

  // ───────────────────────── updateUser ─────────────────────────

  describe('updateUser', () => {
    let userId;
    beforeEach(() => {
      const u = mgr.register({ email: 'a@b.com', displayName: 'Alice' });
      userId = u.id;
    });

    test('updates displayName', () => {
      const u = mgr.updateUser(userId, { displayName: 'Alice Updated' });
      expect(u.displayName).toBe('Alice Updated');
    });

    test('updates role to admin', () => {
      const u = mgr.updateUser(userId, { role: 'admin' });
      expect(u.role).toBe('admin');
    });

    test('updates role back to customer', () => {
      mgr.updateUser(userId, { role: 'admin' });
      const u = mgr.updateUser(userId, { role: 'customer' });
      expect(u.role).toBe('customer');
    });

    test('can update multiple fields at once', () => {
      const u = mgr.updateUser(userId, { displayName: 'New', role: 'admin' });
      expect(u.displayName).toBe('New');
      expect(u.role).toBe('admin');
    });

    test('persists changes', () => {
      mgr.updateUser(userId, { displayName: 'Persisted' });
      expect(mgr.getUserById(userId).displayName).toBe('Persisted');
    });

    test('throws UserNotFoundError for unknown id', () => {
      expect(() => mgr.updateUser('USR-999999', { displayName: 'X' })).toThrow(UserNotFoundError);
    });

    test.each([
      ['empty displayName', { displayName: '' }],
      ['whitespace displayName', { displayName: '   ' }],
      ['invalid role', { role: 'superadmin' }],
    ])('throws ValidationError for %s', (_, updates) => {
      expect(() => mgr.updateUser(userId, updates)).toThrow(ValidationError);
    });
  });

  // ───────────────────────── deactivateUser ─────────────────────────

  describe('deactivateUser', () => {
    test('sets active to false', () => {
      const u = mgr.register({ email: 'a@b.com', displayName: 'Alice' });
      mgr.deactivateUser(u.id);
      expect(mgr.getUserById(u.id).active).toBe(false);
    });

    test('throws UserNotFoundError for unknown id', () => {
      expect(() => mgr.deactivateUser('USR-999999')).toThrow(UserNotFoundError);
    });
  });

  // ───────────────────────── listUsers ─────────────────────────

  describe('listUsers', () => {
    test('returns all users including inactive', () => {
      const u = mgr.register({ email: 'a@b.com', displayName: 'A' });
      mgr.register({ email: 'b@c.com', displayName: 'B' });
      mgr.deactivateUser(u.id);
      expect(mgr.listUsers()).toHaveLength(2);
    });

    test('returns empty array when no users', () => {
      expect(mgr.listUsers()).toEqual([]);
    });
  });

  // ───────────────────────── listActiveUsers ─────────────────────────

  describe('listActiveUsers', () => {
    test('excludes deactivated users', () => {
      const u = mgr.register({ email: 'a@b.com', displayName: 'A' });
      mgr.register({ email: 'b@c.com', displayName: 'B' });
      mgr.deactivateUser(u.id);
      const active = mgr.listActiveUsers();
      expect(active).toHaveLength(1);
      expect(active[0].email).toBe('b@c.com');
    });

    test('returns all users when none are deactivated', () => {
      mgr.register({ email: 'a@b.com', displayName: 'A' });
      mgr.register({ email: 'b@c.com', displayName: 'B' });
      expect(mgr.listActiveUsers()).toHaveLength(2);
    });

    test('returns empty array when no users', () => {
      expect(mgr.listActiveUsers()).toEqual([]);
    });
  });

  // ───────────────────────── size ─────────────────────────

  describe('size', () => {
    test('reflects number of registered users', () => {
      expect(mgr.size).toBe(0);
      mgr.register({ email: 'a@b.com', displayName: 'A' });
      expect(mgr.size).toBe(1);
      mgr.register({ email: 'b@c.com', displayName: 'B' });
      expect(mgr.size).toBe(2);
    });
  });

  // ───────────────────────── error names ─────────────────────────

  describe('error classes', () => {
    test('UserNotFoundError has correct name', () => {
      expect(new UserNotFoundError('x').name).toBe('UserNotFoundError');
    });
    test('DuplicateEmailError has correct name', () => {
      expect(new DuplicateEmailError('x').name).toBe('DuplicateEmailError');
    });
  });
});
