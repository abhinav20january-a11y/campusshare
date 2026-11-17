import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { authenticateUser } from '../middleware/auth.js';
import { query, atomic } from '../config/db.js';
import { wrap, ok, ensure, id } from '../utils/core.js';

export const demoPayments = Router();
demoPayments.use(authenticateUser);

const receiptFields = 'reference, method, summary, created_at';

demoPayments.get('/:id/demo-payment', wrap(async (req, res) => {
  const transactionId = id(req.params.id);
  const [transaction] = await query(
    'SELECT owner_id, borrower_id FROM transactions WHERE id=?',
    [transactionId]
  );

  ensure(
    transaction && [transaction.owner_id, transaction.borrower_id].includes(req.user.id),
    403,
    'Exchange participant access required'
  );

  const [receipt] = await query(
    `SELECT ${receiptFields} FROM demo_payments WHERE transaction_id=?`,
    [transactionId]
  );
  ok(res, receipt || null);
}));

demoPayments.post('/:id/demo-payment', wrap(async (req, res) => {
  const method = ['card', 'upi'].includes(req.body?.method)
    ? req.body.method
    : 'upi';
  const summary = String(req.body?.summary || '').slice(0, 100);

  const receipt = await atomic(async db => {
    const [transaction] = await query(
      'SELECT id, borrower_id, status FROM transactions WHERE id=? FOR UPDATE',
      [id(req.params.id)],
      db
    );

    ensure(
      transaction?.borrower_id === req.user.id,
      403,
      'Only the borrower can run this sandbox'
    );

    const [existing] = await query(
      `SELECT ${receiptFields} FROM demo_payments WHERE transaction_id=?`,
      [transaction.id],
      db
    );
    if (existing) return existing;

    ensure(
      ['ACCEPTED', 'HANDOVER_PENDING'].includes(transaction.status),
      409,
      'The owner must accept before sandbox checkout'
    );

    const reference = 'RZP-TEST-' + randomUUID();
    await query(
      'INSERT INTO demo_payments(transaction_id, reference, method, summary) VALUES(?,?,?,?)',
      [transaction.id, reference, method, summary],
      db
    );

    return {
      reference,
      method,
      summary,
      created_at: new Date().toISOString()
    };
  });

  ok(res, receipt);
}));
