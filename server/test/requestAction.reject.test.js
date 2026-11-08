// Tests for requestAction rejection and cancellation flows
import { requestAction } from '../src/services/borrowing.js';
import { query } from '../src/config/db.js';
import { notify } from '../src/services/events.js';

jest.mock('../src/config/db.js', () => ({
  query: jest.fn()
}));
jest.mock('../src/services/events.js', () => ({
  notify: jest.fn()
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test('owner rejects a pending request', async () => {
  // request lookup
  query.mockImplementationOnce(() => [{ item_id: 10 }]); // lookup request
  // fetch item
  query.mockImplementationOnce(() => [{ id: 10, owner_id: 2, status: 'ACTIVE', max_borrow_duration: 72 }]);
  // fetch borrow request (locked)
  query.mockImplementationOnce(() => [{ id: 30, status: 'REQUESTED', borrower_id: 5, owner_id: 2 }]);
  // update request status to REJECTED
  query.mockImplementationOnce(() => []);
  const owner = { id: 2, role: 'USER' };
  const result = await requestAction(owner, 30, 'reject', 'Not available');
  expect(result).toMatchObject({ status: 'REJECTED' });
  expect(notify).toHaveBeenCalledWith(expect.anything(), 5, 'REQUEST_REJECTED', expect.any(String), expect.stringContaining('/my-requests'));
});

test('borrower cancels their own request', async () => {
  query.mockImplementationOnce(() => [{ item_id: 20 }]); // request lookup
  query.mockImplementationOnce(() => [{ id: 20, owner_id: 3, status: 'ACTIVE', max_borrow_duration: 72 }]);
  query.mockImplementationOnce(() => [{ id: 40, status: 'REQUESTED', borrower_id: 7, owner_id: 3 }]);
  query.mockImplementationOnce(() => []); // update to CANCELLED
  const borrower = { id: 7, role: 'USER' };
  const result = await requestAction(borrower, 40, 'cancel');
  expect(result).toMatchObject({ status: 'CANCELLED' });
  expect(notify).toHaveBeenCalledWith(expect.anything(), 3, 'REQUEST_CANCELLED', expect.any(String), expect.stringContaining('/my-requests'));
});
