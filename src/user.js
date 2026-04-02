'use strict';

/**
 * User management for the digital store.
 */

const { ValidationError } = require('./product');

class UserNotFoundError extends Error {
  constructor(id) {
    super(`User not found: ${id}`);
    this.name = 'UserNotFoundError';
  }
}

class DuplicateEmailError extends Error {
  constructor(email) {
    super(`Email already registered: ${email}`);
    this.name = 'DuplicateEmailError';
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @typedef {'customer'|'admin'} UserRole
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} displayName
 * @property {UserRole} role
 * @property {boolean} active
 * @property {Date} createdAt
 */

function validateEmail(email) {
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new ValidationError(`Invalid email address: ${email}`);
  }
}

let _nextUserId = 1;
function _generateUserId() {
  return `USR-${String(_nextUserId++).padStart(6, '0')}`;
}

function _resetUserIdCounter() {
  _nextUserId = 1;
}

class UserManager {
  constructor() {
    this._users = new Map();     // id -> User
    this._emailIndex = new Map(); // email -> id
  }

  /**
   * Registers a new user.
   * @param {Object} data
   * @param {string} data.email
   * @param {string} data.displayName
   * @param {UserRole} [data.role='customer']
   * @returns {User}
   */
  register(data) {
    validateEmail(data.email);
    const email = data.email.trim().toLowerCase();
    if (this._emailIndex.has(email)) {
      throw new DuplicateEmailError(email);
    }
    if (!data.displayName || typeof data.displayName !== 'string' || data.displayName.trim() === '') {
      throw new ValidationError('displayName must be a non-empty string');
    }
    const role = data.role === 'admin' ? 'admin' : 'customer';
    const user = {
      id: _generateUserId(),
      email,
      displayName: data.displayName.trim(),
      role,
      active: true,
      createdAt: new Date(),
    };
    this._users.set(user.id, user);
    this._emailIndex.set(email, user.id);
    return { ...user };
  }

  /**
   * Returns a user by id.
   * @param {string} id
   * @returns {User}
   */
  getUserById(id) {
    const user = this._users.get(id);
    if (!user) throw new UserNotFoundError(id);
    return { ...user };
  }

  /**
   * Returns a user by email.
   * @param {string} email
   * @returns {User}
   */
  getUserByEmail(email) {
    validateEmail(email);
    const key = email.trim().toLowerCase();
    const id = this._emailIndex.get(key);
    if (!id) throw new UserNotFoundError(key);
    return { ...this._users.get(id) };
  }

  /**
   * Updates a user's displayName or role.
   * @param {string} id
   * @param {Object} updates
   * @returns {User}
   */
  updateUser(id, updates) {
    const user = this._users.get(id);
    if (!user) throw new UserNotFoundError(id);
    if (updates.displayName !== undefined) {
      if (typeof updates.displayName !== 'string' || updates.displayName.trim() === '') {
        throw new ValidationError('displayName must be a non-empty string');
      }
      user.displayName = updates.displayName.trim();
    }
    if (updates.role !== undefined) {
      if (updates.role !== 'customer' && updates.role !== 'admin') {
        throw new ValidationError("role must be 'customer' or 'admin'");
      }
      user.role = updates.role;
    }
    return { ...user };
  }

  /**
   * Deactivates a user account.
   * @param {string} id
   */
  deactivateUser(id) {
    const user = this._users.get(id);
    if (!user) throw new UserNotFoundError(id);
    user.active = false;
  }

  /**
   * Returns all registered users (active and inactive).
   * @returns {User[]}
   */
  listUsers() {
    return Array.from(this._users.values()).map(u => ({ ...u }));
  }

  /**
   * Returns only active users.
   * @returns {User[]}
   */
  listActiveUsers() {
    return Array.from(this._users.values()).filter(u => u.active).map(u => ({ ...u }));
  }

  get size() {
    return this._users.size;
  }
}

module.exports = { UserManager, UserNotFoundError, DuplicateEmailError, _resetUserIdCounter };
