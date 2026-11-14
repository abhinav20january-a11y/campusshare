import './server/src/config/env.js';
import { pool } from './server/src/config/db.js';
import bcrypt from './server/node_modules/bcrypt/bcrypt.js';

const password = 'Demo@1234';
const hash = await bcrypt.hash(password, 12);

// Create lender (item owner)
const [lender] = await pool.execute(
  `INSERT INTO users (name, email, password_hash, university, department, year, hostel, role, verified, onboarding_complete, status)
   VALUES (?, ?, ?, 'BML Munjal University', 'Computer Science', 2, 'BML Munjal Campus', 'STUDENT', TRUE, TRUE, 'ACTIVE')
   ON DUPLICATE KEY UPDATE verified=TRUE, status='ACTIVE', password_hash=VALUES(password_hash)`,
  ['Demo Lender', 'demo.lender@bmu.edu.in', hash]
);

// Create borrower
const [borrower] = await pool.execute(
  `INSERT INTO users (name, email, password_hash, university, department, year, hostel, role, verified, onboarding_complete, status)
   VALUES (?, ?, ?, 'BML Munjal University', 'Computer Science', 1, 'BML Munjal Campus', 'STUDENT', TRUE, TRUE, 'ACTIVE')
   ON DUPLICATE KEY UPDATE verified=TRUE, status='ACTIVE', password_hash=VALUES(password_hash)`,
  ['Demo Borrower', 'demo.borrower@bmu.edu.in', hash]
);

// Get lender ID
const [[lenderRow]] = await pool.execute(
  `SELECT id FROM users WHERE email='demo.lender@bmu.edu.in'`
);

// Create a demo item owned by lender (if not already exists)
const [[existingItem]] = await pool.execute(
  `SELECT id FROM items WHERE owner_id=? AND slug='demo-camera-kit' LIMIT 1`,
  [lenderRow.id]
);

if (!existingItem) {
  const [item] = await pool.execute(
    `INSERT INTO items (owner_id, name, slug, category, subcategory, description, item_condition, location, max_borrow_duration, included, pickup_instructions, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      lenderRow.id,
      'Canon EOS Demo Camera',
      'demo-camera-kit',
      'Photography',
      'Photography',
      'Demo camera for borrowing. Please handle with care and return all accessories.',
      'EXCELLENT',
      'Academic Block',
      48,
      'Camera body, lens, charger',
      'Meet at Academic Block lobby, ground floor.'
    ]
  );
  console.log('✅ Demo item created  → Item ID:', item.insertId);
} else {
  console.log('✅ Demo item already exists → Item ID:', existingItem.id);
}

pool.end();

console.log('');
console.log('══════════════════════════════════════════');
console.log('  DEMO ACCOUNTS READY');
console.log('══════════════════════════════════════════');
console.log('');
console.log('  🧑 LENDER (item owner)');
console.log('     Email   : demo.lender@bmu.edu.in');
console.log('     Password: Demo@1234');
console.log('');
console.log('  🎓 BORROWER');
console.log('     Email   : demo.borrower@bmu.edu.in');
console.log('     Password: Demo@1234');
console.log('');
console.log('  📋 DEMO STEPS:');
console.log('  1. Log in as BORROWER');
console.log('  2. Find "Canon EOS Demo Camera" and request to borrow it');
console.log('  3. Log out → Log in as LENDER');
console.log('  4. Go to Requests → Incoming → Accept the request');
console.log('  5. Email fires to anuproject08@gmail.com 📧');
console.log('══════════════════════════════════════════');
