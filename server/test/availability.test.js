// Real tests for assertAvailable function
import { assertAvailable } from '../src/services/borrowing.js';
import { query } from '../src/config/db.js';

jest.mock('../src/config/db.js', () => ({
  query: jest.fn()
}));

const mockItem = (overrides = {}) => ({
  id: 1,
  status: 'ACTIVE',
  max_borrow_duration: 48,
  ...overrides
});

test('assertAvailable succeeds when item is free and within limits', async () => {
  const item = mockItem();
  query.mockResolvedValueOnce([]); // availability windows
  query.mockResolvedValueOnce([]); // overlap
  await expect(assertAvailable(null, item, '2025-01-01', '2025-01-02')).resolves.toBeUndefined();
});

test('assertAvailable fails when item is inactive', async () => {
  const item = mockItem({ status: 'INACTIVE' });
  await expect(assertAvailable(null, item, '2025-01-01', '2025-01-02')).rejects.toMatchObject({ status: 409 });
});

test('assertAvailable fails when duration exceeds max limit', async () => {
  const item = mockItem();
  await expect(assertAvailable(null, item, '2025-01-01', '2025-02-10')).rejects.toMatchObject({ status: 400 });
});

test('assertAvailable fails on overlapping reservation', async () => {
  const item = mockItem();
  query.mockResolvedValueOnce([]); // windows ok
  query.mockResolvedValueOnce([{ id: 99 }]); // overlapping transaction
  await expect(assertAvailable(null, item, '2025-01-01', '2025-01-02')).rejects.toMatchObject({ status: 409 });
});
