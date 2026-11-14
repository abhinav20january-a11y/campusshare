
import { query, atomic } from '../config/db.js';
import { ensure, id, date, text } from '../utils/core.js';
import { sendMail } from '../../utils/mailer.js';
import { notify, event, updateTrust } from './events.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

// ============================================
// AVAILABILITY VALIDATION
// ============================================

export async function assertAvailable(db, item, start, end) {
  ensure(item.status === 'ACTIVE', 409, 'This item is not available');

  ensure(
    (new Date(end + 'Z') - new Date(start + 'Z')) / 3600000
      <= item.max_borrow_duration,
    400,
    'Borrowing duration exceeds the owner’s limit'
  );

  const windows = await query(
    'SELECT id FROM item_availability WHERE item_id=?',
    [item.id],
    db
  );

  if (windows.length) {
    const within = await query(
      `SELECT id FROM item_availability
       WHERE item_id=? AND start_time<=? AND end_time>=?`,
      [item.id, start, end],
      db
    );

    ensure(
      within.length,
      409,
      'The selected dates are outside the available period'
    );
  }

  const overlap = await query(
    `SELECT t.id
     FROM transactions t
     JOIN borrow_requests r ON r.id=t.request_id
     WHERE t.item_id=?
       AND t.status NOT IN ('COMPLETED','CANCELLED')
       AND ?<t.expected_return
       AND ?>r.start_time
     LIMIT 1`,
    [item.id, start, end],
    db
  );

  ensure(
    !overlap.length,
    409,
    'This item is already reserved during the selected period.'
  );
}

// ============================================
// CREATE BORROWING REQUEST
// ============================================

export async function createRequest(user, b) {
  return atomic(async db => {
    const [item] = await query(
      'SELECT * FROM items WHERE id=? FOR UPDATE',
      [id(b.itemId)],
      db
    );

    ensure(item, 404, 'Item not found');

    ensure(
      item.owner_id !== user.id,
      400,
      'You cannot borrow your own item'
    );

    const [owner] = await query(
      'SELECT university,status FROM users WHERE id=?',
      [item.owner_id],
      db
    );

    ensure(
      owner.status === 'ACTIVE',
      403,
      'This owner account is not active.'
    );

    if (item.circle_id) {
      const m = await query(
        `SELECT user_id FROM circle_members
         WHERE circle_id=? AND user_id=?`,
        [item.circle_id, user.id],
        db
      );

      ensure(m.length, 403, 'Join this circle first');
    }

    const start = date(b.startTime);
    const end = date(b.endTime);

    ensure(
      new Date(start + 'Z') > Date.now() - 60000 && end > start,
      400,
      'Choose a future start and a later end time'
    );

    await assertAvailable(db, item, start, end);

    const r = await query(
      `INSERT INTO borrow_requests
       (item_id,borrower_id,owner_id,start_time,end_time,purpose,message)
       VALUES(?,?,?,?,?,?,?)`,
      [
        item.id,
        user.id,
        item.owner_id,
        start,
        end,
        text(b.purpose, 'Purpose', 300),
        String(b.message || '').slice(0, 1000)
      ],
      db
    );

    const c = await query(
      'INSERT INTO conversations(request_id) VALUES(?)',
      [r.insertId],
      db
    );

    await query(
      `INSERT INTO conversation_participants
       (conversation_id,user_id)
       VALUES(?,?),(?,?)`,
      [c.insertId, user.id, c.insertId, item.owner_id],
      db
    );

    await notify(
      db,
      item.owner_id,
      'REQUEST_RECEIVED',
      `${user.name} requested ${item.name}`,
      '/requests/incoming'
    );

    return {
      id: r.insertId,
      conversationId: c.insertId
    };
  });
}

// ============================================
// ACCEPT / REJECT / CANCEL REQUEST
// WITH AUTOMATIC EMAIL AND PDF RECEIPT
// ============================================

export async function requestAction(
  user,
  requestId,
  action,
  reason = ''
) {
  // STEP 1: Complete database transaction first

  const result = await atomic(async db => {
    const [lookup] = await query(
      'SELECT item_id FROM borrow_requests WHERE id=?',
      [id(requestId)],
      db
    );

    ensure(lookup, 404, 'Request not found');

    const [item] = await query(
      'SELECT * FROM items WHERE id=? FOR UPDATE',
      [lookup.item_id],
      db
    );

    const [r] = await query(
      'SELECT * FROM borrow_requests WHERE id=? FOR UPDATE',
      [id(requestId)],
      db
    );

    ensure(
      r.status === 'REQUESTED',
      409,
      'This request has already been processed'
    );

    ensure(
      action === 'cancel'
        ? r.borrower_id === user.id
        : r.owner_id === user.id,
      403,
      'You cannot manage this request'
    );

    // ========================================
    // ACCEPT REQUEST AND SNAPSHOT PRICES
    // ========================================

    if (action === 'accept') {
      await assertAvailable(
        db,
        item,
        r.start_time,
        r.end_time
      );

      // Read prices from the item at acceptance time.
      // These values are stored permanently in the transaction.

      const borrowingFee = Number(item.borrowing_fee || 0);
      const securityDeposit = Number(item.security_deposit || 0);

      ensure(
        Number.isFinite(borrowingFee) &&
        Number.isFinite(securityDeposit) &&
        borrowingFee >= 0 &&
        securityDeposit >= 0,
        400,
        'Invalid item pricing'
      );

      const totalAmount = Math.round(
        (borrowingFee + securityDeposit) * 100
      );

      // Free transactions do not require Razorpay checkout.
      const paymentStatus = totalAmount === 0
        ? 'PAID'
        : 'PENDING';

      await query(
        "UPDATE borrow_requests SET status='ACCEPTED' WHERE id=?",
        [r.id],
        db
      );

      const t = await query(
        `INSERT INTO transactions
         (
           request_id,
           item_id,
           owner_id,
           borrower_id,
           expected_return,
           borrowing_fee,
           security_deposit,
           payment_status
         )
         VALUES(?,?,?,?,?,?,?,?)`,
        [
          r.id,
          r.item_id,
          r.owner_id,
          r.borrower_id,
          r.end_time,
          borrowingFee.toFixed(2),
          securityDeposit.toFixed(2),
          paymentStatus
        ],
        db
      );

      // Record transaction event
      await event(
        db,
        t.insertId,
        user.id,
        'ACCEPTED'
      );

      // In-app notification
      await notify(
        db,
        r.borrower_id,
        'REQUEST_ACCEPTED',
        `${item.name}: request accepted`,
        `/borrowings/${t.insertId}`
      );

      return {
        transactionId: t.insertId
      };
    }

    // ========================================
    // REJECT OR CANCEL REQUEST
    // ========================================

    const state =
      action === 'cancel' ? 'CANCELLED' : 'REJECTED';

    await query(
      'UPDATE borrow_requests SET status=?,reason=? WHERE id=?',
      [state, String(reason).slice(0, 500), r.id],
      db
    );

    await notify(
      db,
      action === 'cancel' ? r.owner_id : r.borrower_id,
      'REQUEST_' + state,
      `${item.name}: request ${state.toLowerCase()}`,
      '/my-requests'
    );

    return {
      status: state
    };
  });

  // ========================================
  // STEP 2: SEND EMAIL AFTER DATABASE COMMIT
  // ========================================

  if (action === 'accept' && result.transactionId) {
    try {
      const [receipt] = await query(
        `SELECT
          t.*,

          r.start_time AS start_date,
          r.end_time AS end_date,

          i.name AS item_name,
          i.category AS category,
          i.item_condition AS item_condition,
          i.location AS item_location,

          b.name AS borrower_name,
          b.email AS borrower_email,
          b.university AS borrower_university,

          o.name AS owner_name,
          o.email AS owner_email,
          o.university AS owner_university

        FROM transactions t

        JOIN borrow_requests r
          ON r.id = t.request_id

        JOIN items i
          ON i.id = t.item_id

        JOIN users b
          ON b.id = t.borrower_id

        JOIN users o
          ON o.id = t.owner_id

        WHERE t.id=?`,
        [result.transactionId]
      );

      if (!receipt) {
        throw new Error('Transaction receipt details not found');
      }

      if (!receipt.borrower_email) {
        throw new Error('Borrower email address not found');
      }

      // Build detailed PDF receipt data.
      // This is an acceptance receipt, not proof of payment.

      const receiptData = {
        id: receipt.id,
        status: receipt.status,

        created_at:
          receipt.created_at || new Date().toISOString(),

        start_date: receipt.start_date,
        end_date: receipt.end_date,

        item: {
          name: receipt.item_name,
          category: receipt.category,
          item_condition: receipt.item_condition,
          location: receipt.item_location
        },

        borrower: {
          name: receipt.borrower_name,
          email: receipt.borrower_email,
          university: receipt.borrower_university
        },

        owner: {
          name: receipt.owner_name,
          email: receipt.owner_email,
          university: receipt.owner_university
        }

        // Payment details will be included in the
        // payment receipt after successful verification.
      };

      await sendMail({
        to: receipt.borrower_email,

        subject: 'CampusShare - Borrowing Confirmation',

        html: `
          <div style="
            font-family: Arial, sans-serif;
            color: #334155;
            max-width: 600px;
            margin: auto;
            padding: 20px;
          ">

            <h2 style="color: #2563EB;">
              CampusShare
            </h2>

            <h3>Borrowing Request Accepted!</h3>

            <p>
              Hello ${escapeHtml(receipt.borrower_name)},
            </p>

            <p>
              Good news! Your borrowing request has been
              accepted by
              <strong>${escapeHtml(receipt.owner_name)}</strong>.
            </p>

            <div style="
              background: #EFF6FF;
              padding: 16px;
              border-radius: 8px;
            ">
              <p>
                <strong>Item:</strong>
                ${escapeHtml(receipt.item_name)}
              </p>

              <p>
                <strong>Transaction ID:</strong>
                ${escapeHtml(receipt.id)}
              </p>

              <p>
                <strong>Status:</strong>
                ${escapeHtml(receipt.status)}
              </p>

              <p>
                <strong>Borrowing fee:</strong>
                ₹${escapeHtml(receipt.borrowing_fee)}
              </p>

              <p>
                <strong>Refundable security deposit:</strong>
                ₹${escapeHtml(receipt.security_deposit)}
              </p>

              <p>
                <strong>Payment status:</strong>
                ${escapeHtml(receipt.payment_status)}
              </p>
            </div>

            <p>
              Your detailed PDF transaction receipt
              is attached to this email.
            </p>

            <p>
              Thank you for using CampusShare!
            </p>

            <p style="color: #64748B; font-size: 12px;">
              This is an automated email.
              Please do not reply directly.
            </p>

          </div>
        `,

        attachPdf: receiptData
      });

      console.log(
        `CampusShare receipt successfully sent to ${receipt.borrower_email}`
      );

    } catch (emailError) {
      // Do not undo an already committed transaction.
      console.error(
        'Transaction created, but receipt email failed:',
        emailError.message
      );
    }
  }

  return result;
}

// ============================================
// FETCH TRANSACTION
// ============================================

export async function transactionFor(
  user,
  txId,
  db,
  lock = false
) {
  const [t] = await query(
    `SELECT * FROM transactions
     WHERE id=? ${lock ? 'FOR UPDATE' : ''}`,
    [id(txId)],
    db
  );

  ensure(t, 404, 'Transaction not found');

  ensure(
    [t.owner_id, t.borrower_id].includes(user.id) ||
      user.role === 'ADMIN',
    403,
    'Only participants can view this transaction'
  );

  return t;
}

// ============================================
// EVIDENCE UPLOAD
// ============================================

async function evidence(db, table, user, tx, ids) {
  ensure(
    Array.isArray(ids) && ids.length <= 6,
    400,
    'Upload up to six photos'
  );

  for (const upload of ids) {
    const [u] = await query(
      'SELECT id FROM uploads WHERE id=? AND user_id=?',
      [id(upload), user],
      db
    );

    ensure(
      u,
      400,
      'Evidence must be uploaded by you'
    );

    await query(
      `INSERT INTO ${table}
       (transaction_id,user_id,upload_id)
       VALUES(?,?,?)`,
      [tx, user, u.id],
      db
    );
  }
}

// ============================================
// HANDOVER
// ============================================

export async function handover(user, txId, b) {
  return atomic(async db => {
    const t = await transactionFor(user, txId, db, true);

    ensure(
      [t.owner_id, t.borrower_id].includes(user.id),
      403,
      'Participant access required'
    );

    ensure(
      ['ACCEPTED', 'HANDOVER_PENDING'].includes(t.status),
      409,
      'Handover is not available in this state'
    );

    // ========================================
    // PAYMENT VERIFICATION GUARD
    // ========================================

    ensure(
      t.payment_status === 'PAID' ||
      (
        Number(t.borrowing_fee) === 0 &&
        Number(t.security_deposit) === 0
      ),
      409,
      'Complete payment before handover'
    );

    const field =
      user.id === t.owner_id
        ? 'owner_handover'
        : 'borrower_handover';

    ensure(
      !t[field],
      409,
      'You already confirmed handover'
    );

    await evidence(
      db,
      'handover_evidence',
      user.id,
      t.id,
      b.evidence || []
    );

    await query(
      `UPDATE transactions
       SET ${field}=UTC_TIMESTAMP(),
           status='HANDOVER_PENDING'
       WHERE id=?`,
      [t.id],
      db
    );

    await event(
      db,
      t.id,
      user.id,
      'HANDOVER_PENDING',
      user.id === t.owner_id
        ? 'Owner confirmed item given'
        : 'Borrower confirmed item received'
    );

    if (
      user.id === t.owner_id
        ? t.borrower_handover
        : t.owner_handover
    ) {
      await event(db, t.id, user.id, 'HANDED_OVER');

      await query(
        `UPDATE transactions
         SET status='ACTIVE',
             handover_time=UTC_TIMESTAMP()
         WHERE id=?`,
        [t.id],
        db
      );

      await event(db, t.id, user.id, 'ACTIVE');

      await notify(
        db,
        t.borrower_id,
        'HANDOVER_REMINDER',
        'Handover complete. Your borrowing is active.',
        `/borrowings/${t.id}`
      );
    }

    return {
      id: t.id
    };
  });
}

// ============================================
// RETURN ITEM
// ============================================

export async function returnItem(user, txId, b) {
  return atomic(async db => {
    const t = await transactionFor(user, txId, db, true);

    if (user.id === t.borrower_id) {
      ensure(
        ['ACTIVE', 'OVERDUE'].includes(t.status),
        409,
        'Return cannot start in this state'
      );

      await evidence(
        db,
        'return_evidence',
        user.id,
        t.id,
        b.evidence || []
      );

      await query(
        `UPDATE transactions
         SET status='RETURN_PENDING',
             return_condition=?,
             return_notes=?
         WHERE id=?`,
        [
          text(b.condition, 'Condition', 30),
          String(b.notes || '').slice(0, 2000),
          t.id
        ],
        db
      );

      await event(
        db,
        t.id,
        user.id,
        'RETURN_PENDING'
      );

      await notify(
        db,
        t.owner_id,
        'RETURN_REMINDER',
        'Please confirm the returned item and its condition.',
        `/borrowings/${t.id}`
      );

    } else {
      ensure(
        user.id === t.owner_id &&
          t.status === 'RETURN_PENDING',
        409,
        'Wait for the borrower to start the return'
      );

      await evidence(
        db,
        'return_evidence',
        user.id,
        t.id,
        b.evidence || []
      );

      await event(
        db,
        t.id,
        user.id,
        'RETURNED'
      );

      await query(
        `UPDATE transactions
         SET status='COMPLETED',
             actual_return=UTC_TIMESTAMP()
         WHERE id=?`,
        [t.id],
        db
      );

      // Notify users who favorited this item.
      const favUsers = await query(
        'SELECT user_id FROM favorites WHERE item_id=?',
        [t.item_id],
        db
      );

      for (const fu of favUsers) {
        await notify(
          db,
          fu.user_id,
          'AVAILABILITY_ALERT',
          `Item "${t.item_id}" is now available`,
          `/items/${t.item_id}`
        );
      }

      await query(
        `UPDATE borrow_requests
         SET status='COMPLETED'
         WHERE id=?`,
        [t.request_id],
        db
      );

      await event(
        db,
        t.id,
        user.id,
        'COMPLETED'
      );

      await updateTrust(db, t.borrower_id);
      await updateTrust(db, t.owner_id);

      await notify(
        db,
        t.borrower_id,
        'REVIEW_RECEIVED',
        'Return confirmed. You can now leave a review.',
        `/borrowings/${t.id}`
      );
    }

    return {
      id: t.id
    };
  });
}

// ============================================
// OVERDUE TRANSACTIONS
// ============================================

export async function overdue() {
  return atomic(async db => {
    const due = await query(
      `SELECT id,borrower_id
       FROM transactions
       WHERE status='ACTIVE'
         AND expected_return<UTC_TIMESTAMP()
       FOR UPDATE`,
      [],
      db
    );

    for (const t of due) {
      await query(
        "UPDATE transactions SET status='OVERDUE' WHERE id=?",
        [t.id],
        db
      );

      await event(
        db,
        t.id,
        null,
        'OVERDUE'
      );

      await notify(
        db,
        t.borrower_id,
        'OVERDUE',
        'Your item is overdue. Arrange its return now.',
        `/borrowings/${t.id}`
      );
    }
  });
}
