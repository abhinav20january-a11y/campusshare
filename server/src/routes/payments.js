// server/src/routes/payments.js
import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { wrap, ok, ensure } from '../utils/core.js';
import { transactionFor } from '../services/borrowing.js';
import { configuration, razorpay, validSignature } from '../services/razorpay.js';
import { query, atomic } from '../config/db.js';
import { id } from '../utils/core.js';

export const paymentsRoutes = Router();
paymentsRoutes.use(authenticateUser);

// Helper to fetch transaction and ensure borrower access
async function borrowerTx(req, db, lock = false) {
  const tx = await transactionFor(req.user, id(req.params.txId), db, lock);
  ensure(tx.borrower_id === req.user.id, 403, 'Only the borrower can manage payment');
  return tx;
}

// Create Razorpay order for a transaction
paymentsRoutes.post('/:txId/create', wrap(async (req, res) => {
  ensure(configuration().configured, 503, 'Razorpay not configured');
  const order = await atomic(async db => {
    const tx = await borrowerTx(req, db, true);
    // Check if an order already exists for this transaction
    const [existing] = await query('SELECT order_id FROM razorpay_orders WHERE transaction_id = ?', [tx.id], db);
    if (existing) return existing;
    const { amount, currency } = configuration();
    const razorOrder = await razorpay('/orders', 'POST', {
      amount,
      currency,
      receipt: `campusshare-${tx.id}`,
      notes: { transaction_id: String(tx.id) }
    });
    ensure(razorOrder.id, 502, 'Failed to obtain Razorpay order');
    await query(
      'INSERT INTO razorpay_orders(transaction_id, order_id, amount, currency) VALUES(?,?,?,?)',
      [tx.id, razorOrder.id, amount, currency],
      db
    );
    return { order_id: razorOrder.id, amount, currency, status: 'created' };
  });
  ok(res, { ...order, key: process.env.RAZORPAY_KEY_ID });
}));

// Verify payment after Razorpay checkout
paymentsRoutes.post('/:txId/verify', wrap(async (req, res) => {
  ensure(configuration().configured, 503, 'Razorpay not configured');
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const tx = await borrowerTx(req, undefined, false);
  const [order] = await query('SELECT * FROM razorpay_orders WHERE transaction_id = ?', [tx.id]);
  ensure(order && razorpay_order_id === order.order_id, 400, 'Mismatched order');
  ensure(
    typeof razorpay_payment_id === 'string' &&
    /^pay_[a-zA-Z0-9]+$/.test(razorpay_payment_id),
    400,
    'Invalid payment id'
  );
  ensure(
    validSignature(
      order.order_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    ),
    400,
    'Signature verification failed'
  );
  const payment = await razorpay('/payments/' + razorpay_payment_id);
  ensure(
    payment.order_id === order.order_id &&
    payment.amount === order.amount &&
    payment.currency === order.currency,
    400,
    'Payment details mismatch'
  );
  ensure(['captured', 'authorized'].includes(payment.status), 409, 'Payment not completed');
  await query(
    "UPDATE razorpay_orders SET payment_id = ?, status = ? WHERE id = ?",
    [payment.id, payment.status, order.id]
  );
  // Activate transaction now that payment succeeded
  await query('UPDATE transactions SET status = ? WHERE id = ?', ['ACTIVE', tx.id]);
  ok(res, { status: payment.status, payment_id: payment.id });
}));
