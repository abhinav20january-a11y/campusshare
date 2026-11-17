import { returnItem } from '../src/services/borrowing.js';
import { notify, event, updateTrust } from '../src/services/events.js';
import { query } from '../src/config/db.js';

jest.mock('../src/config/db.js', () => ({
  query: jest.fn(),
  atomic: fn => fn({})
}));

jest.mock('../src/services/events.js', () => ({
  notify: jest.fn(),
  event: jest.fn(),
  updateTrust: jest.fn()
}));

beforeEach(() => {
  query.mockReset();
  notify.mockReset();
  event.mockReset();
  updateTrust.mockReset();
});

test('returnItem triggers availability alerts for every user who saved the item', async () => {
  query
    .mockResolvedValueOnce([{
      id: 1,
      item_id: 55,
      owner_id: 2,
      borrower_id: 3,
      status: 'RETURN_PENDING',
      request_id: 999
    }])
    .mockResolvedValueOnce([]) // mark transaction COMPLETED
    .mockResolvedValueOnce([{ user_id: 101 }, { user_id: 202 }])
    .mockResolvedValueOnce([]); // mark request COMPLETED

  await returnItem({ id: 2, role: 'USER' }, 1, { evidence: [] });

  expect(notify).toHaveBeenCalledWith(
    expect.anything(),
    101,
    'AVAILABILITY_ALERT',
    expect.any(String),
    '/items/55'
  );
  expect(notify).toHaveBeenCalledWith(
    expect.anything(),
    202,
    'AVAILABILITY_ALERT',
    expect.any(String),
    '/items/55'
  );
  expect(updateTrust).toHaveBeenCalledWith(expect.anything(), 3);
  expect(updateTrust).toHaveBeenCalledWith(expect.anything(), 2);
});
