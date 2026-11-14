
import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { query, atomic } from '../config/db.js';
import { wrap, ok, ensure, id } from '../utils/core.js';
import {
  configuration,
  razorpay,
  validSignature
} from '../services/razorpay.js';

export const razorpayRoutes = Router();

razorpayRoutes.use(authenticateUser);

// Fetch a transaction and verify that the current user is a participant.
async function participant(req, db, lock = false) {
  const [transaction] = await query(
    `SELECT
       id,
       item_id,
       owner_id,
       borrower_id,
       status,
       borrowing_fee,
       security_deposit,
       payment_status
     FROM transactions
     WHERE id = ?${lock ? ' FOR UPDATE' : ''}`,
    [id(req.params.id)],
    db
  );

  ensure(
    transaction &&
      (
        transaction.borrower_id === req.user.id ||
        transaction.owner_id === req.user.id
      ),
    403,
    'Exchange participant access required'
  );

  return transaction;
}

// Calculate the total in paise using the transaction price snapshot.
function calculateAmount(transaction) {
  const fee = Number(transaction.borrowing_fee);
  const deposit = Number(transaction.security_deposit);

  ensure(
    Number.isFinite(fee) &&
      Number.isFinite(deposit) &&
      fee >= 0 &&
      deposit >= 0,
    400,
    'Invalid transaction pricing'
  );

  return Math.round((fee + deposit) * 100);
}

// Get payment configuration and existing order.
razorpayRoutes.get(
  '/:id/payment',
  wrap(async (req, res) => {
    const transaction = await participant(req);

    const [order] = await query(
      `SELECT order_id, payment_id, amount, currency, status
       FROM razorpay_orders
       WHERE transaction_id = ?`,
      [transaction.id]
    );

    const amount = calculateAmount(transaction);

    ok(res, {
      ...configuration(),
      amount,
      currency: 'INR',
      payment_status: transaction.payment_status,
      order: order || null
    });
  })
);

// Create a Razorpay order for the actual borrowing fee + security deposit.
razorpayRoutes.post(
  '/:id/payment/order',
  wrap(async (req, res) => {
    ensure(
      configuration().configured,
      503,
      'Razorpay Test Mode keys are not configured yet'
    );

    const result = await atomic(async db => {
      const transaction = await participant(req, db, true);

      ensure(
        transaction.borrower_id === req.user.id,
        403,
        'Only the borrower can pay'
      );

      ensure(
        ['ACCEPTED', 'HANDOVER_PENDING'].includes(transaction.status),
        409,
        'Owner acceptance is required before payment'
      );

      ensure(
        transaction.payment_status !== 'PAID',
        409,
        'This transaction has already been paid'
      );

      const amount = calculateAmount(transaction);

      ensure(amount > 0, 400, 'There is no payment amount due');

      const currency = 'INR';

      const [existing] = await query(
        `SELECT id, order_id, payment_id, amount, currency, status
         FROM razorpay_orders
         WHERE transaction_id = ?`,
        [transaction.id],
        db
      );

      // Reuse an existing unpaid order only when its amount is correct.
      if (existing && existing.amount === amount) {
        ensure(
          !existing.payment_id,
          409,
          'A payment is already associated with this transaction'
        );

        return {
          order_id: existing.order_id,
          amount: existing.amount,
          currency: existing.currency,
          status: existing.status
        };
      }

      // A previous order may have been created using the old fixed amount.
      // It cannot be reused with a different amount.
      if (existing) {
        ensure(
          !existing.payment_id,
          409,
          'An existing payment is associated with this transaction'
        );

        await query(
          'DELETE FROM razorpay_orders WHERE id = ?',
          [existing.id],
          db
        );
      }

      const order = await razorpay('/orders', 'POST', {
        amount,
        currency,
        receipt: 'campusshare-' + transaction.id,
        notes: {
          transaction_id: String(transaction.id),
          borrowing_fee: String(transaction.borrowing_fee),
          security_deposit: String(transaction.security_deposit),
          mode: 'college_test'
        }
      });

      ensure(
        order.id &&
          order.amount === amount &&
          order.currency === currency,
        502,
        'Unexpected Razorpay order response'
      );

      await query(
        `INSERT INTO razorpay_orders
          (transaction_id, order_id, amount, currency, status)
         VALUES (?, ?, ?, ?, ?)`,
        [
          transaction.id,
          order.id,
          amount,
          currency,
          'created'
        ],
        db
      );

      return {
        order_id: order.id,
        amount,
        currency,
        status: 'created'
      };
    });

    ok(res, {
      ...result,
      key: process.env.RAZORPAY_KEY_ID,
      mode: 'test'
    });
  })
);

// Verify Razorpay signature and confirm that payment is captured.
razorpayRoutes.post(
  '/:id/payment/verify',
  wrap(async (req, res) => {
    ensure(
      configuration().configured,
      503,
      'Razorpay configuration is missing'
    );

    const transaction = await participant(req);

    ensure(
      transaction.borrower_id === req.user.id,
      403,
      'Only the borrower can verify payment'
    );

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const [order] = await query(
      `SELECT *
       FROM razorpay_orders
       WHERE transaction_id = ?`,
      [transaction.id]
    );

    ensure(
      order && razorpay_order_id === order.order_id,
      400,
      'Payment order does not match this exchange'
    );

    ensure(
      typeof razorpay_payment_id === 'string' &&
        /^pay_[a-zA-Z0-9]+$/.test(razorpay_payment_id),
      400,
      'Invalid payment ID'
    );

    ensure(
      validSignature(
        order.order_id,
        razorpay_payment_id,
        razorpay_signature,
        process.env.RAZORPAY_KEY_SECRET
      ),
      400,
      'Payment signature verification failed'
    );

    // Confirm payment directly with Razorpay.
    const payment = await razorpay(
      '/payments/' + razorpay_payment_id
    );

    ensure(
      payment.order_id === order.order_id &&
        payment.amount === order.amount &&
        payment.currency === order.currency,
      400,
      'Payment details do not match'
    );

    // An authorized payment is not treated as completed.
    ensure(
      payment.status === 'captured',
      409,
      'Payment has not been captured yet'
    );

    // Update payment and transaction together.
    await atomic(async db => {
      const lockedTransaction = await participant(req, db, true);

      ensure(
        lockedTransaction.borrower_id === req.user.id,
        403,
        'Only the borrower can verify payment'
      );

      const [lockedOrder] = await query(
        `SELECT *
         FROM razorpay_orders
         WHERE transaction_id = ?
         FOR UPDATE`,
        [lockedTransaction.id],
        db
      );

      ensure(
        lockedOrder &&
          lockedOrder.order_id === order.order_id &&
          lockedOrder.amount === payment.amount,
        409,
        'Payment order changed during verification'
      );

      if (lockedTransaction.payment_status === 'PAID') {
        ensure(
          lockedOrder.payment_id === payment.id,
          409,
          'A different payment is already recorded'
        );

        return;
      }

      await query(
        `UPDATE razorpay_orders
         SET payment_id = ?, status = 'captured'
         WHERE id = ?`,
        [payment.id, lockedOrder.id],
        db
      );

      await query(
        `UPDATE transactions
         SET payment_status = 'PAID'
         WHERE id = ?`,
        [lockedTransaction.id],
        db
      );
    });

    ok(res, {
      status: 'captured',
      payment_status: 'PAID',
      payment_id: payment.id,
      amount: payment.amount,
      currency: payment.currency
    });
  })
);
