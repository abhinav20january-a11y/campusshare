
import './src/config/env.js';
import { pool } from './src/config/db.js';
import bcrypt from 'bcrypt';

const password = 'Demo@123456';

// Demo account details
const lender = {
  name: 'Demo Lender',
  email: 'demo.lender@bmu.edu.in'
};

const borrower = {
  name: 'Demo Borrower',
  email: 'anuproject08@gmail.com'
};

async function seedDemo() {
  try {
    console.log('\nCreating CampusShare demo data...\n');

    // Generate password hash
    const hash = await bcrypt.hash(password, 12);

    // Create or update lender
    await pool.execute(
      `INSERT INTO users
       (name, email, password_hash, university, department, year,
        hostel, role, verified, onboarding_complete, status)
       VALUES (?, ?, ?, 'BML Munjal University', 'Computer Science',
        2, 'BML Munjal Campus', 'STUDENT', TRUE, TRUE, 'ACTIVE')
       ON DUPLICATE KEY UPDATE
        verified = TRUE,
        status = 'ACTIVE',
        password_hash = VALUES(password_hash)`,
      [lender.name, lender.email, hash]
    );

    console.log('Lender account ready.');

    // Create or update borrower
    await pool.execute(
      `INSERT INTO users
       (name, email, password_hash, university, department, year,
        hostel, role, verified, onboarding_complete, status)
       VALUES (?, ?, ?, 'BML Munjal University', 'Computer Science',
        1, 'BML Munjal Campus', 'STUDENT', TRUE, TRUE, 'ACTIVE')
       ON DUPLICATE KEY UPDATE
        verified = TRUE,
        status = 'ACTIVE',
        password_hash = VALUES(password_hash)`,
      [borrower.name, borrower.email, hash]
    );

    console.log('Borrower account ready.');

    // Get lender ID
    const [[lenderRow]] = await pool.execute(
      `SELECT id FROM users WHERE email = ?`,
      [lender.email]
    );

    if (!lenderRow) {
      throw new Error('Unable to retrieve lender ID.');
    }

    // Check existing demo item
    const [[existingItem]] = await pool.execute(
      `SELECT id FROM items
       WHERE owner_id = ? AND slug = ?
       LIMIT 1`,
      [lenderRow.id, 'demo-camera-kit']
    );

    let itemId;

    if (!existingItem) {
      // Create demo item
      const [item] = await pool.execute(
        `INSERT INTO items
         (owner_id, name, slug, category, subcategory, description,
          item_condition, location, max_borrow_duration, included,
          pickup_instructions, status)
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

      itemId = item.insertId;
      console.log('Demo item created. ID:', itemId);
    } else {
      itemId = existingItem.id;
      console.log('Demo item already exists. ID:', itemId);
    }

    // Display credentials
    console.log('\n==========================================');
    console.log('       CAMPUSSHARE DEMO ACCOUNTS');
    console.log('==========================================');

    console.log('\nLENDER (Item Owner)');
    console.log('Email    :', lender.email);
    console.log('Password :', password);

    console.log('\nBORROWER');
    console.log('Email    :', borrower.email);
    console.log('Password :', password);

    console.log('\nDEMO ITEM');
    console.log('Name     : Canon EOS Demo Camera');
    console.log('Item ID  :', itemId);

    console.log('\n==========================================');
    console.log('       DEMO WORKFLOW');
    console.log('==========================================');

    console.log('1. Login as borrower.');
    console.log('2. Find Canon EOS Demo Camera.');
    console.log('3. Click Request to Borrow.');
    console.log('4. Fill in borrowing dates and submit.');
    console.log('5. Logout and login as lender.');
    console.log('6. Open Incoming Requests.');
    console.log('7. Accept the borrowing request.');
    console.log('8. Check anuproject08@gmail.com for the email.');
    console.log('9. Verify the PDF receipt attachment, if enabled.');

    console.log('\n==========================================');
    console.log('       DEMO DATA READY!');
    console.log('==========================================\n');

  } catch (error) {
    console.error('\nError creating demo data:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await seedDemo();
