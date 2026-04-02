'use strict';

const { isNonEmptyString, isValidEmail, generateId } = require('./utils');

let _sequence = 0;

/**
 * In-memory users store: { [userId]: user }
 * User shape: { id, name, email, role, active, createdAt }
 */
const _users = {};

/** User roles */
const ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
};

/**
 * Resets the in-memory store (used in tests).
 */
function _reset() {
  for (const key of Object.keys(_users)) {
    delete _users[key];
  }
  _sequence = 0;
}

/**
 * Creates a new user.
 * @param {{ name: string, email: string, role?: string }} data
 * @returns {object} Created user (without sensitive fields)
 */
function createUser({ name, email, role = ROLES.CUSTOMER } = {}) {
  if (!isNonEmptyString(name)) throw new Error('name is required');
  if (!isValidEmail(email)) throw new Error('valid email is required');
  if (!Object.values(ROLES).includes(role)) throw new Error(`Invalid role: ${role}`);

  // Enforce unique email
  const existing = Object.values(_users).find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (existing) throw new Error(`Email already in use: ${email}`);

  _sequence += 1;
  const user = {
    id: generateId('USR', _sequence),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    active: true,
    createdAt: new Date().toISOString(),
  };
  _users[user.id] = user;
  return { ...user };
}

/**
 * Retrieves a user by ID.
 * @param {string} userId
 * @returns {object|null}
 */
function getUserById(userId) {
  const user = _users[userId];
  return user ? { ...user } : null;
}

/**
 * Retrieves a user by email (case-insensitive).
 * @param {string} email
 * @returns {object|null}
 */
function getUserByEmail(email) {
  if (typeof email !== 'string') return null;
  const found = Object.values(_users).find(
    (u) => u.email === email.trim().toLowerCase()
  );
  return found ? { ...found } : null;
}

/**
 * Lists all active users (admins only in a real app).
 * @returns {object[]}
 */
function listUsers() {
  return Object.values(_users)
    .filter((u) => u.active)
    .map((u) => ({ ...u }));
}

/**
 * Updates a user's name or role.
 * @param {string} userId
 * @param {{ name?: string, role?: string, active?: boolean }} updates
 * @returns {object} Updated user
 */
function updateUser(userId, updates = {}) {
  if (!isNonEmptyString(userId)) throw new Error('userId is required');
  const user = _users[userId];
  if (!user) throw new Error(`User not found: ${userId}`);

  if (updates.name !== undefined) {
    if (!isNonEmptyString(updates.name)) throw new Error('name must be a non-empty string');
    user.name = updates.name.trim();
  }
  if (updates.role !== undefined) {
    if (!Object.values(ROLES).includes(updates.role)) throw new Error(`Invalid role: ${updates.role}`);
    user.role = updates.role;
  }
  if (updates.active !== undefined) {
    user.active = Boolean(updates.active);
  }
  return { ...user };
}

/**
 * Deactivates a user account.
 * @param {string} userId
 * @returns {object} Deactivated user
 */
function deactivateUser(userId) {
  return updateUser(userId, { active: false });
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  listUsers,
  updateUser,
  deactivateUser,
  ROLES,
  _reset,
};
