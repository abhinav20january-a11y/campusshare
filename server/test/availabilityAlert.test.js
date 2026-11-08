import { returnItem } from '../src/services/borrowing.js';
import { notify } from '../src/services/events.js';

// Mock the events service
jest.mock('../src/services/events.js', () => ({
  notify: jest.fn(),
  event: jest.fn(),
  updateTrust: jest.fn()
}));

// Mock the DB module
jest.mock('../src/config/db.js', () => ({
  query: jest.fn(),
  atomic: (fn) => fn({})
}));

import { query } from '../src/config/db.js';

describe('Availability alert after owner completes returnItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should notify favorited users when owner marks return completed', async () => {
    // transactionFor mock – return a transaction in RETURN_PENDING state with owner_id
    query.mockImplementationOnce(() => [{
      id: 1,
      item_id: 42,
      owner_id: 2,
      borrower_id: 3,
      status: 'RETURN_PENDING',
      request_id: 7
    }]); // transactionFor
    // UPDATE transactions to COMPLETED
    query.mockImplementationOnce(() => []); // UPDATE transactions SET status='COMPLETED' ...
    // SELECT favorites for the item
    query.mockImplementationOnce(() => [{ user_id: 10 }, { user_id: 11 }]); // favorites list
    // Remaining queries (borrow_requests update, events, trust updates, etc.)
    query.mockImplementation(() => []);

    // Owner (id 2) completes the return
    await returnItem({ id: 2 }, 1, { condition: 'good', notes: '' });

    expect(notify).toHaveBeenCalledWith(expect.anything(), 10, 'AVAILABILITY_ALERT', expect.any(String), '/items/42');
    expect(notify).toHaveBeenCalledWith(expect.anything(), 11, 'AVAILABILITY_ALERT', expect.any(String), '/items/42');
  });
});
