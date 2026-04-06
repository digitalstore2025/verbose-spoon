'use strict';

const {
  createUser,
  getUserById,
  getUserByEmail,
  listUsers,
  updateUser,
  deactivateUser,
  ROLES,
  _reset,
} = require('../src/users');

beforeEach(() => {
  _reset();
});

describe('createUser', () => {
  test('creates a user with all required fields', () => {
    const user = createUser({ name: 'Alice', email: 'alice@example.com' });
    expect(user.id).toMatch(/^USR-\d{6}$/);
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
    expect(user.role).toBe(ROLES.CUSTOMER);
    expect(user.active).toBe(true);
    expect(user.createdAt).toBeDefined();
  });

  test('creates an admin user when role is specified', () => {
    const user = createUser({ name: 'Bob', email: 'bob@example.com', role: ROLES.ADMIN });
    expect(user.role).toBe(ROLES.ADMIN);
  });

  test('stores email in lowercase', () => {
    const user = createUser({ name: 'Carol', email: 'Carol@EXAMPLE.COM' });
    expect(user.email).toBe('carol@example.com');
  });

  test('trims whitespace from name', () => {
    const user = createUser({ name: '  Dave  ', email: 'dave@example.com' });
    expect(user.name).toBe('Dave');
  });

  test('assigns sequential IDs', () => {
    const u1 = createUser({ name: 'A', email: 'a@test.com' });
    const u2 = createUser({ name: 'B', email: 'b@test.com' });
    expect(u1.id).toBe('USR-000001');
    expect(u2.id).toBe('USR-000002');
  });

  test('throws when name is missing', () => {
    expect(() => createUser({ email: 'x@x.com' })).toThrow('name is required');
  });

  test('throws when name is empty string', () => {
    expect(() => createUser({ name: '', email: 'x@x.com' })).toThrow('name is required');
  });

  test('throws for an invalid email', () => {
    expect(() => createUser({ name: 'X', email: 'notanemail' })).toThrow('valid email is required');
  });

  test('throws for an invalid role', () => {
    expect(() => createUser({ name: 'X', email: 'x@x.com', role: 'superuser' })).toThrow('Invalid role');
  });

  test('throws when email is already in use', () => {
    createUser({ name: 'First', email: 'dup@example.com' });
    expect(() => createUser({ name: 'Second', email: 'dup@example.com' })).toThrow('Email already in use');
  });

  test('throws when email is already in use regardless of case', () => {
    createUser({ name: 'First', email: 'dup@example.com' });
    expect(() => createUser({ name: 'Second', email: 'DUP@EXAMPLE.COM' })).toThrow('Email already in use');
  });

  test('throws when called with no arguments', () => {
    expect(() => createUser()).toThrow();
  });
});

describe('getUserById', () => {
  test('returns the user when found', () => {
    const created = createUser({ name: 'Alice', email: 'a@a.com' });
    const found = getUserById(created.id);
    expect(found).toEqual(created);
  });

  test('returns null for an unknown ID', () => {
    expect(getUserById('USR-999999')).toBeNull();
  });

  test('returns a copy (not the same reference)', () => {
    const created = createUser({ name: 'Alice', email: 'a@a.com' });
    const found = getUserById(created.id);
    found.name = 'Hacked';
    expect(getUserById(created.id).name).toBe('Alice');
  });
});

describe('getUserByEmail', () => {
  test('returns the user when found', () => {
    const created = createUser({ name: 'Alice', email: 'alice@example.com' });
    const found = getUserByEmail('alice@example.com');
    expect(found.id).toBe(created.id);
  });

  test('lookup is case-insensitive', () => {
    createUser({ name: 'Alice', email: 'alice@example.com' });
    const found = getUserByEmail('ALICE@EXAMPLE.COM');
    expect(found).not.toBeNull();
  });

  test('returns null when not found', () => {
    expect(getUserByEmail('unknown@example.com')).toBeNull();
  });

  test('returns null for a non-string argument', () => {
    expect(getUserByEmail(null)).toBeNull();
    expect(getUserByEmail(42)).toBeNull();
  });
});

describe('listUsers', () => {
  test('returns all active users', () => {
    createUser({ name: 'A', email: 'a@a.com' });
    createUser({ name: 'B', email: 'b@b.com' });
    expect(listUsers()).toHaveLength(2);
  });

  test('excludes inactive users', () => {
    const u = createUser({ name: 'A', email: 'a@a.com' });
    deactivateUser(u.id);
    expect(listUsers()).toHaveLength(0);
  });

  test('returns an empty array when no users exist', () => {
    expect(listUsers()).toHaveLength(0);
  });
});

describe('updateUser', () => {
  test('updates the user name', () => {
    const u = createUser({ name: 'Old', email: 'x@x.com' });
    const updated = updateUser(u.id, { name: 'New' });
    expect(updated.name).toBe('New');
  });

  test('updates the user role', () => {
    const u = createUser({ name: 'Alice', email: 'a@a.com' });
    const updated = updateUser(u.id, { role: ROLES.ADMIN });
    expect(updated.role).toBe(ROLES.ADMIN);
  });

  test('deactivates the user when active is set to false', () => {
    const u = createUser({ name: 'Alice', email: 'a@a.com' });
    const updated = updateUser(u.id, { active: false });
    expect(updated.active).toBe(false);
  });

  test('does not modify unspecified fields', () => {
    const u = createUser({ name: 'Alice', email: 'a@a.com' });
    updateUser(u.id, { name: 'New Name' });
    expect(getUserById(u.id).email).toBe('a@a.com');
  });

  test('returns user unchanged when called with no updates', () => {
    const u = createUser({ name: 'Alice', email: 'a@a.com' });
    const result = updateUser(u.id);
    expect(result).toEqual(u);
  });



  test('throws when userId is empty', () => {
    expect(() => updateUser('', { name: 'X' })).toThrow('userId is required');
  });

  test('throws when updating name to an empty string', () => {
    const u = createUser({ name: 'Alice', email: 'a@a.com' });
    expect(() => updateUser(u.id, { name: '' })).toThrow('name must be a non-empty string');
  });

  test('throws when updating to an invalid role', () => {
    const u = createUser({ name: 'Alice', email: 'a@a.com' });
    expect(() => updateUser(u.id, { role: 'superadmin' })).toThrow('Invalid role');
  });
});

describe('deactivateUser', () => {
  test('sets the user active flag to false', () => {
    const u = createUser({ name: 'Alice', email: 'a@a.com' });
    const result = deactivateUser(u.id);
    expect(result.active).toBe(false);
  });

  test('deactivated user is no longer returned by listUsers', () => {
    const u = createUser({ name: 'Alice', email: 'a@a.com' });
    deactivateUser(u.id);
    expect(listUsers()).toHaveLength(0);
  });

  test('throws when user is not found', () => {
    expect(() => deactivateUser('USR-000099')).toThrow('User not found');
  });
});
