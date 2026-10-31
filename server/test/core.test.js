// Unit Tests — CampusShare Core Utilities
// File: server/test/core.test.js
// Run: node --test test/core.test.js

import test from 'node:test';
import assert from 'node:assert/strict';

// ─── Import utilities ─────────────────────────────────────────────────────────
// Adjust path if needed based on your project structure
import { ensure, text, id, date, AppError } from '../src/utils/core.js';

// ─── Test Suite: ensure() ─────────────────────────────────────────────────────

test('ensure() — passes when condition is true', () => {
  assert.doesNotThrow(() => ensure(true, 400, 'Should not throw'));
});

test('ensure() — throws AppError when condition is false', () => {
  assert.throws(
    () => ensure(false, 400, 'Test error message'),
    (err) => {
      assert.ok(err instanceof AppError, 'Should be an AppError instance');
      assert.equal(err.status, 400);
      assert.equal(err.message, 'Test error message');
      return true;
    }
  );
});

test('ensure() — throws with correct 403 status', () => {
  assert.throws(
    () => ensure(false, 403, 'Forbidden'),
    (err) => {
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test('ensure() — throws with correct 404 status', () => {
  assert.throws(
    () => ensure(false, 404, 'Not found'),
    (err) => {
      assert.equal(err.status, 404);
      return true;
    }
  );
});

// ─── Test Suite: text() ───────────────────────────────────────────────────────

test('text() — accepts a valid string within length limits', () => {
  const result = text('Hello World', 'Name', 100);
  assert.equal(result, 'Hello World');
});

test('text() — trims leading and trailing whitespace', () => {
  const result = text('  hello  ', 'Name', 100);
  assert.equal(result, 'hello');
});

test('text() — rejects empty string when minimum is 1', () => {
  assert.throws(
    () => text('', 'Name', 100, 1),
    (err) => {
      assert.equal(err.status, 400);
      return true;
    }
  );
});

test('text() — rejects string exceeding max length', () => {
  const tooLong = 'a'.repeat(201);
  assert.throws(
    () => text(tooLong, 'Description', 200),
    (err) => {
      assert.equal(err.status, 400);
      return true;
    }
  );
});

test('text() — accepts string exactly at max length', () => {
  const exactly200 = 'a'.repeat(200);
  assert.doesNotThrow(() => text(exactly200, 'Description', 200));
});

// ─── Test Suite: id() ─────────────────────────────────────────────────────────

test('id() — accepts a valid positive integer string', () => {
  const result = id('42');
  assert.equal(result, 42);
  assert.equal(typeof result, 'number');
});

test('id() — rejects zero', () => {
  assert.throws(
    () => id('0'),
    (err) => {
      assert.equal(err.status, 400);
      return true;
    }
  );
});

test('id() — rejects negative integers', () => {
  assert.throws(
    () => id('-1'),
    (err) => {
      assert.equal(err.status, 400);
      return true;
    }
  );
});

test('id() — rejects non-numeric strings', () => {
  assert.throws(
    () => id('abc'),
    (err) => {
      assert.equal(err.status, 400);
      return true;
    }
  );
});

test('id() — rejects floating point numbers', () => {
  assert.throws(
    () => id('3.14'),
    (err) => {
      assert.equal(err.status, 400);
      return true;
    }
  );
});

// ─── Test Suite: date() ───────────────────────────────────────────────────────

test('date() — parses a valid ISO datetime string', () => {
  const result = date('2025-06-15T10:00:00');
  assert.ok(typeof result === 'string', 'Should return a string');
  assert.ok(result.includes('2025-06-15'), 'Should contain the correct date');
});

test('date() — rejects an invalid date string', () => {
  assert.throws(
    () => date('not-a-date'),
    (err) => {
      assert.equal(err.status, 400);
      return true;
    }
  );
});

test('date() — rejects empty string', () => {
  assert.throws(
    () => date(''),
    (err) => {
      assert.equal(err.status, 400);
      return true;
    }
  );
});

// ─── Test Suite: AppError ─────────────────────────────────────────────────────

test('AppError — has correct status and message properties', () => {
  const err = new AppError(422, 'Unprocessable entity');
  assert.equal(err.status, 422);
  assert.equal(err.message, 'Unprocessable entity');
  assert.ok(err instanceof Error, 'Should extend Error');
});

test('AppError — is instance of both AppError and Error', () => {
  const err = new AppError(500, 'Server error');
  assert.ok(err instanceof AppError);
  assert.ok(err instanceof Error);
});
