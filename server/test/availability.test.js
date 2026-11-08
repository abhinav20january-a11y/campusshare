const { returnItem } = require('../src/services/borrowing');
const { notify } = require('../src/services/events');

jest.mock('../src/services/events', () => ({
  notify: jest.fn(),
  event: jest.fn(),
  updateTrust: jest.fn()
}));

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  atomic: (fn) => fn({})
}));

const { query } = require('../src/config/db');

describe('Availability alert after returnItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should notify favorited users when transaction completes', async () => {
    // Mock transaction retrieval
    query.mockImplementationOnce(() => [{
      id: 1,
      item_id: 42,
      owner_id: 2,
      borrower_id: 3,
      status: 'RETURN_PENDING'
    }]); // transactionFor
    // Mock borrow request update
    query.mockImplementationOnce(() => []); // UPDATE borrow_requests
    // Mock favorites list
    query.mockImplementationOnce(() => [{ user_id: 10 }, { user_id: 11 }]);
    // Mock final queries for status update and other updates
    query.mockImplementation(() => []);

    await returnItem({ id: 3 }, 1, { condition: 'good', notes: '' });

    expect(notify).toHaveBeenCalledWith(expect.anything(), 10, 'AVAILABILITY_ALERT', expect.any(String), '/items/42');
    expect(notify).toHaveBeenCalledWith(expect.anything(), 11, 'AVAILABILITY_ALERT', expect.any(String), '/items/42');
  });
});
