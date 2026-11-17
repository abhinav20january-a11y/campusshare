import jwt from 'jsonwebtoken';
import {
  authenticateUser,
  requireAdmin,
  verified
} from '../src/middleware/auth.js';
import { query } from '../src/config/db.js';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { verify: jest.fn() }
}));

jest.mock('../src/config/db.js', () => ({
  query: jest.fn()
}));

jest.mock('../src/config/env.js', () => ({
  jwtSecret: 'test-jwt-secret'
}));

function response() {
  return { clearCookie: jest.fn() };
}

beforeEach(() => {
  jwt.verify.mockReset();
  query.mockReset();
});

test('missing login token is rejected with 401', async () => {
  const next = jest.fn();
  await authenticateUser({ cookies: {}, headers: {} }, response(), next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
});

test('invalid login token is rejected with 401', async () => {
  jwt.verify.mockImplementation(() => { throw new Error('bad token'); });
  const next = jest.fn();
  await authenticateUser(
    { cookies: { campusshare: 'invalid' }, headers: {} },
    response(),
    next
  );
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
});

test('valid token loads an active user and continues', async () => {
  jwt.verify.mockReturnValue({ sub: '7', v: 2 });
  query.mockResolvedValueOnce([{
    id: 7,
    token_version: 2,
    status: 'ACTIVE',
    role: 'USER',
    verified: true
  }]);
  const req = { cookies: { campusshare: 'valid' }, headers: {} };
  const next = jest.fn();

  await authenticateUser(req, response(), next);

  expect(req.user.id).toBe(7);
  expect(next).toHaveBeenCalledWith();
});

test('inactive account is rejected with 403', async () => {
  jwt.verify.mockReturnValue({ sub: '7', v: 2 });
  query.mockResolvedValueOnce([{
    id: 7,
    token_version: 2,
    status: 'SUSPENDED'
  }]);
  const next = jest.fn();

  await authenticateUser(
    { cookies: { campusshare: 'valid' }, headers: {} },
    response(),
    next
  );

  expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
});

test('student cannot use administrator middleware', () => {
  const next = jest.fn();
  requireAdmin({ user: { role: 'USER' } }, {}, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
});

test('unverified student is blocked from verified-only actions', () => {
  const next = jest.fn();
  verified({ user: { verified: false } }, {}, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
});

test('verified administrator passes both role checks', () => {
  const adminNext = jest.fn();
  const verifiedNext = jest.fn();
  const req = { user: { role: 'ADMIN', verified: true } };
  requireAdmin(req, {}, adminNext);
  verified(req, {}, verifiedNext);
  expect(adminNext).toHaveBeenCalledWith();
  expect(verifiedNext).toHaveBeenCalledWith();
});
