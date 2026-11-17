// Mock config/env.js before anything imports it
jest.mock('../src/config/env.js', () => ({
  jwtSecret: 'test-jwt-secret-key-at-least-32-chars-long',
  production: false,
  demoVerification: true
}));

// Mock DB module
jest.mock('../src/config/db.js', () => ({
  query: jest.fn(),
  atomic: jest.fn(fn => fn({}))
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

import { login } from '../src/controllers/authController.js';
import { query } from '../src/config/db.js';
import bcrypt from 'bcrypt';

describe('User Login Controller (TC-06, TC-07, TC-08)', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {
        email: 'student@campusshare.demo',
        password: 'ValidPassword123'
      }
    };
    res = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('TC-06: Valid user login sets session cookie and returns user data', async () => {
    // 1. DB query finds user record
    query.mockResolvedValueOnce([
      {
        id: 1,
        password_hash: '$2b$12$hashedpassword',
        status: 'ACTIVE',
        token_version: 0
      }
    ]);

    // 2. Password matches
    bcrypt.compare.mockResolvedValueOnce(true);

    // 3. Second query fetches public user profile
    query.mockResolvedValueOnce([
      {
        id: 1,
        name: 'Aarav Singh',
        email: 'student@campusshare.demo',
        role: 'USER',
        status: 'ACTIVE',
        verified: 1
      }
    ]);

    await login(req, res);

    // Cookie set
    expect(res.cookie).toHaveBeenCalledWith(
      'campusshare',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: '/' })
    );

    // Status 200 returned with user
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: 1,
            email: 'student@campusshare.demo'
          })
        })
      })
    );
  });

  test('TC-07: Login with wrong password returns 401 Unauthorized', async () => {
    query.mockResolvedValueOnce([
      {
        id: 1,
        password_hash: '$2b$12$hashedpassword',
        status: 'ACTIVE',
        token_version: 0
      }
    ]);

    // Password comparison fails
    bcrypt.compare.mockResolvedValueOnce(false);

    await expect(login(req, res)).rejects.toMatchObject({
      status: 401,
      message: 'Email or password is incorrect'
    });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  test('TC-08: Login with non-existent email returns 401 Unauthorized', async () => {
    // User not found in DB
    query.mockResolvedValueOnce([]);

    await expect(login(req, res)).rejects.toMatchObject({
      status: 401,
      message: 'Email or password is incorrect'
    });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  test('TC-08b: Login with inactive / suspended account returns 403 Forbidden', async () => {
    query.mockResolvedValueOnce([
      {
        id: 1,
        password_hash: '$2b$12$hashedpassword',
        status: 'SUSPENDED',
        token_version: 0
      }
    ]);

    bcrypt.compare.mockResolvedValueOnce(true);

    await expect(login(req, res)).rejects.toMatchObject({
      status: 403,
      message: 'Your account is not active'
    });
    expect(res.cookie).not.toHaveBeenCalled();
  });

  test('Boundary: Login with invalid email format returns 400 Bad Request', async () => {
    req.body.email = 'not-an-email';

    await expect(login(req, res)).rejects.toMatchObject({
      status: 400,
      message: 'Enter a valid email'
    });
    expect(query).not.toHaveBeenCalled();
  });
});
