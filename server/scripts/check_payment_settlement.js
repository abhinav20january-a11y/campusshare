// check_payment_settlement.js
// Utility script to verify if any Razorpay payment has been settled (captured)
import { pool } from '../src/config/db.js';

async function checkSettlement() {
  try {
    const [rows] = await pool.execute(
      `SELECT id, transaction_id, payment_id, status, created_at, updated_at
       FROM razorpay_orders
       WHERE payment_id IS NOT NULL`
    );

    if (rows.length === 0) {
      console.log('✅ No settled payments found in the database.');
    } else {
      console.log('✅ Settled payments (payment_id not null):');
      rows.forEach(r => {
        const settled = r.status && r.status.toLowerCase() === 'captured';
        console.log(`- Order ID: ${r.id}, Transaction ID: ${r.transaction_id}, Status: ${r.status}${settled ? ' (CAPTURED)' : ''}`);
      });
    }
  } catch (e) {
    console.error('Error checking payment settlement:', e);
  } finally {
    await pool.end();
  }
}

checkSettlement();
