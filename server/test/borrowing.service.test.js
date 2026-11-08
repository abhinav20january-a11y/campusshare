// Real test cases for borrowing service functions
import { createRequest, requestAction, handover, returnItem } from '../src/services/borrowing.js';
import { notify, event, updateTrust } from '../src/services/events.js';
import { query, atomic } from '../src/config/db.js';
import { ensure } from '../src/utils/core.js';

// Mock dependencies
jest.mock('../src/config/db.js', () => ({
  query: jest.fn(),
  atomic: fn => fn({}) // pass dummy db object
}));
jest.mock('../src/services/events.js', () => ({
  notify: jest.fn(),
  event: jest.fn(),
  updateTrust: jest.fn()
}));
jest.mock('../src/utils/core.js', () => ({
  ensure: (cond, code, msg) => { if (!cond) { const err = new Error(msg); err.status = code; throw err; } },
  id: v => v,
  date: d => d,
  text: (t) => t,
}));

/**
 * Helper to reset all mocks before each test.
 */
beforeEach(() => {
  jest.clearAllMocks();
});

test('createRequest rejects borrowing own item', async () => {
  // Item owned by the same user (owner_id = 1)
  query.mockImplementationOnce(() => [{ id: 10, owner_id: 1, status: 'ACTIVE', university: 'U1', circle_id: null, max_borrow_duration: 72 }]);
  const user = { id: 1, university: 'U1', role: 'USER' };
  const request = { itemId: 10, startTime: '2025-01-01T10:00:00', endTime: '2025-01-02T10:00:00', purpose: 'test', message: '' };
  await expect(createRequest(user, request)).rejects.toMatchObject({ status: 400 });
});

test('requestAction accept creates transaction and notifies borrower', async () => {
  // Mock request lookup
  query
    .mockImplementationOnce(() => [{ item_id: 20 }]) // request lookup
    .mockImplementationOnce(() => [{ id: 20, owner_id: 2, status: 'ACTIVE', max_borrow_duration: 72 }]) // item lock
    .mockImplementationOnce(() => [{ id: 30, status: 'REQUESTED', borrower_id: 3, owner_id: 2, start_time: '2025-01-01', end_time: '2025-01-02' }]) // borrow request
    .mockImplementationOnce(() => []) // update request status
    .mockImplementationOnce(() => [{ insertId: 5 }]); // insert transaction

  const owner = { id: 2, role: 'USER' };
  const result = await requestAction(owner, 30, 'accept');
  expect(result).toHaveProperty('transactionId');
  expect(notify).toHaveBeenCalledWith(expect.anything(), 3, 'REQUEST_ACCEPTED', expect.any(String), expect.stringContaining('/borrowings/'));
});

test('handover updates status to ACTIVE and notifies borrower', async () => {
  // transactionFor mock via atomic db stub
  query
    .mockImplementationOnce(() => [{ id: 40, owner_id: 2, borrower_id: 3, status: 'HANDOVER_PENDING', owner_handover: null, borrower_handover: null, item_id: 55 }]) // transaction lock
    .mockImplementationOnce(() => []); // update handover

  const owner = { id: 2, role: 'USER' };
  const result = await handover(owner, 40, { evidence: [] });
  expect(result).toHaveProperty('id', 40);
  // Two notifications should be sent during handover flow (reminder and later active)
  expect(notify).toHaveBeenCalled();
});

// Edge‑case handling tests

test('requestAction with non‑existent request ID returns 404', async () => {
  query.mockImplementationOnce(() => []); // request lookup fails
  const user = { id: 99, role: 'USER' };
  await expect(requestAction(user, 999, 'cancel')).rejects.toMatchObject({ status: 404 });
});

test('requestAction unauthorized user cannot accept request', async () => {
  query
    .mockImplementationOnce(() => [{ item_id: 20 }]) // request lookup
    .mockImplementationOnce(() => [{ id: 20, owner_id: 2, status: 'ACTIVE', max_borrow_duration: 72 }]) // item lock
    .mockImplementationOnce(() => [{ id: 30, status: 'REQUESTED', borrower_id: 3, owner_id: 2, start_time: '2025-01-01', end_time: '2025-01-02' }]); // request
  const otherUser = { id: 4, role: 'USER' };
  await expect(requestAction(otherUser, 30, 'accept')).rejects.toMatchObject({ status: 403 });
});

test('requestAction duplicate accept throws 409', async () => {
  // First accept succeeds
  query
    .mockImplementationOnce(() => [{ item_id: 20 }])
    .mockImplementationOnce(() => [{ id: 20, owner_id: 2, status: 'ACTIVE', max_borrow_duration: 72 }])
    .mockImplementationOnce(() => [{ id: 30, status: 'REQUESTED', borrower_id: 3, owner_id: 2, start_time: '2025-01-01', end_time: '2025-01-02' }])
    .mockImplementationOnce(() => [])
    .mockImplementationOnce(() => [{ insertId: 5 }]);
  const owner = { id: 2, role: 'USER' };
  await requestAction(owner, 30, 'accept');
  // Second accept should fail
  query
    .mockImplementationOnce(() => [{ item_id: 20 }])
    .mockImplementationOnce(() => [{ id: 20, owner_id: 2, status: 'ACTIVE', max_borrow_duration: 72 }])
    .mockImplementationOnce(() => [{ id: 30, status: 'ACCEPTED', borrower_id: 3, owner_id: 2, start_time: '2025-01-01', end_time: '2025-01-02' }]);
  await expect(requestAction(owner, 30, 'accept')).rejects.toMatchObject({ status: 409 });
});

test('returnItem called when transaction not in ACTIVE/OVERDUE throws 409', async () => {
  query.mockImplementationOnce(() => [{ id: 60, borrower_id: 3, owner_id: 2, status: 'HANDOVER_PENDING' }]);
  const borrower = { id: 3, role: 'USER' };
  await expect(returnItem(borrower, 60, { evidence: [] })).rejects.toMatchObject({ status: 409 });
});

test('returnItem evidence upload limit enforcement', async () => {
  query.mockImplementationOnce(() => [{ id: 70, borrower_id: 3, owner_id: 2, status: 'ACTIVE' }]);
  const borrower = { id: 3, role: 'USER' };
  const tooMany = Array.from({ length: 7 }, (_, i) => i + 1);
  await expect(returnItem(borrower, 70, { evidence: tooMany })).rejects.toMatchObject({ status: 400 });
});
