// Integration test for returnItem flow and availability alert
import test from 'node:test';
import assert from 'node:assert/strict';

// Services and utilities
import * as borrowing from '../src/services/borrowing.js';
import * as events from '../src/services/events.js';
import * as db from '../src/config/db.js';

/**
 * Mock helpers to simulate a minimal environment for the returnItem flow.
 * We replace the low‑level DB queries and notification helpers with lightweight
 * in‑memory stubs so the test can run without a real MySQL instance.
 */
const originalNotify = events.notify;
const originalQuery = db.query;
const originalEvent = events.event;
const originalUpdateTrust = events.updateTrust;
const originalTransactionFor = borrowing.transactionFor;

test('returnItem triggers AVAILABILITY_ALERT for favorited users', async () => {
  // Capture notifications
  const notifications = [];
  events.notify = async (dbConn, userId, type, message, link) => {
    notifications.push({userId, type, message, link});
  };

  // Stub query – only the favorites query is needed for this test.
  db.query = async (sql, params, conn) => {
    if (sql.includes('SELECT user_id FROM favorites')) {
      // Simulate two users who favorited the item.
      return [{ user_id: 101 }, { user_id: 202 }];
    }
    // All other queries return empty results or generic placeholders.
    return [];
  };

  // Stub transactionFor to return a completed transaction ready for owner confirmation.
  borrowing.transactionFor = async (user, txId, dbConn, lock) => ({
    id: 1,
    item_id: 55,
    owner_id: 2,
    borrower_id: 3,
    status: 'RETURN_PENDING', // state after borrower submitted return
    request_id: 999,
  });

  // Stub auxiliary side‑effects.
  events.event = async () => {};
  events.updateTrust = async () => {};

  // Owner confirms the return.
  const owner = { id: 2, role: 'USER' };
  await borrowing.returnItem(owner, 1, { evidence: [] });

  // Verify that the AVAILABILITY_ALERT was sent for each favorite user.
  const alertNotifications = notifications.filter(n => n.type === 'AVAILABILITY_ALERT');
  assert.equal(alertNotifications.length, 2, 'Two availability alerts should be sent');
  assert.equal(alertNotifications[0].userId, 101);
  assert.equal(alertNotifications[1].userId, 202);
});

// Restore original implementations after the test run.
after(() => {
  events.notify = originalNotify;
  db.query = originalQuery;
  events.event = originalEvent;
  events.updateTrust = originalUpdateTrust;
  borrowing.transactionFor = originalTransactionFor;
});
