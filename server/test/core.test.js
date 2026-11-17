import {
  AppError,
  ensure,
  text,
  id,
  date
} from '../src/utils/core.js';

describe('ensure', () => {
  test('allows a true condition', () => {
    expect(() => ensure(true, 400, 'error')).not.toThrow();
  });

  test('throws AppError with the requested status and message', () => {
    expect(() => ensure(false, 403, 'Forbidden')).toThrow(
      expect.objectContaining({ status: 403, message: 'Forbidden' })
    );
  });
});

describe('text', () => {
  test('trims and returns valid text', () => {
    expect(text('  CampusShare  ', 'Name', 30)).toBe('CampusShare');
  });

  test('rejects empty text', () => {
    expect(() => text('   ', 'Name', 30)).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  test('rejects text longer than the maximum', () => {
    expect(() => text('a'.repeat(31), 'Name', 30)).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  test('accepts text exactly at the maximum', () => {
    expect(text('a'.repeat(30), 'Name', 30)).toHaveLength(30);
  });
});

describe('id', () => {
  test('converts a positive integer string', () => {
    expect(id('42')).toBe(42);
  });

  test.each(['0', '-1', '1.5', 'abc'])('rejects invalid ID %s', value => {
    expect(() => id(value)).toThrow(expect.objectContaining({ status: 400 }));
  });
});

describe('date', () => {
  test('normalizes a valid ISO date', () => {
    expect(date('2026-11-15T10:30:00Z')).toBe('2026-11-15 10:30:00');
  });

  test.each(['not-a-date', ''])('rejects invalid date %s', value => {
    expect(() => date(value)).toThrow(expect.objectContaining({ status: 400 }));
  });
});

test('AppError is a normal Error with an HTTP status', () => {
  const error = new AppError(409, 'Conflict');
  expect(error).toBeInstanceOf(Error);
  expect(error).toMatchObject({ status: 409, message: 'Conflict' });
});
