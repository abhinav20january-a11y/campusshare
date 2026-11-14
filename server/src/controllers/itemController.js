
import { query, atomic } from '../config/db.js';
import { ensure, text, id, date, ok } from '../utils/core.js';

/**
 * List of supported item categories.
 */
export const categories = [
  'Electronics',
  'Books',
  'Photography',
  'Sports',
  'Gaming',
  'Tools',
  'Academic',
  'Accessories'
];

/**
 * Common columns selected for item listings.
 * Includes borrowing fee and security deposit.
 */
const columns = `
  i.id,
  i.owner_id,
  i.name,
  i.category,
  i.subcategory,
  i.description,
  i.item_condition,
  i.location,
  i.max_borrow_duration,
  i.borrowing_fee,
  i.security_deposit,
  i.status,
  i.views,
  i.created_at,
  u.name owner_name,
  u.avatar owner_avatar,
  u.average_rating,
  u.trust_score,
  u.verified,
  u.university,
  (
    SELECT url
    FROM item_images
    WHERE item_id = i.id
    ORDER BY position, id
    LIMIT 1
  ) image,
  (
    SELECT COUNT(*)
    FROM favorites
    WHERE item_id = i.id
  ) favorites_count
`;

/**
 * Validate monetary values.
 * Accepts non-negative amounts with up to 2 decimal places.
 * Database column: DECIMAL(10,2)
 */
function validateMoney(value, fieldName) {
  const raw = String(value ?? '0').trim() || '0';

  ensure(
    /^\d{1,8}(\.\d{1,2})?$/.test(raw),
    400,
    `${fieldName} must be a valid amount with up to 2 decimal places`
  );

  const amount = Number(raw);

  ensure(
    Number.isFinite(amount) &&
    amount >= 0 &&
    amount <= 99999999.99,
    400,
    `${fieldName} must be between 0 and 99999999.99`
  );

  return amount.toFixed(2);
}

/**
 * Get all active marketplace items.
 */
export async function list(req, res) {
  const q = req.query;
  const where = ["i.status='ACTIVE'", "u.status='ACTIVE'"];
  const args = [];

  where.push(`
    (
      i.circle_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM circle_members cm
        WHERE cm.circle_id = i.circle_id
        AND cm.user_id = ?
      )
    )
  `);

  args.push(req.user?.id || 0);

  if (q.q) {
    where.push('(i.name LIKE ? OR i.description LIKE ? OR i.category LIKE ?)');
    args.push(...Array(3).fill('%' + String(q.q).slice(0, 100) + '%'));
  }

  for (const [key, col] of [
    ['category', 'i.category'],
    ['condition', 'i.item_condition'],
    ['location', 'i.location'],
    ['university', 'u.university']
  ]) {
    if (q[key]) {
      where.push(`${col}=?`);
      args.push(String(q[key]).slice(0, 120));
    }
  }

  if (q.owner) {
    where.push('i.owner_id=?');
    args.push(id(q.owner));
  }

  if (q.rating) {
    where.push('u.average_rating>=?');
    args.push(Number(q.rating) || 0);
  }

  if (q.trust) {
    where.push('u.trust_score>=?');
    args.push(Number(q.trust) || 0);
  }

  if (q.start && q.end) {
    where.push(`
      NOT EXISTS (
        SELECT 1
        FROM transactions t
        JOIN borrow_requests r ON r.id = t.request_id
        WHERE t.item_id = i.id
        AND t.status NOT IN ('COMPLETED', 'CANCELLED')
        AND ? < t.expected_return
        AND ? > r.start_time
      )
    `);

    args.push(date(q.start), date(q.end));
  }

  const sort = {
    newest: 'i.created_at DESC',
    rating: 'u.average_rating DESC',
    popular: 'i.views DESC',
    recommended: 'u.trust_score DESC, i.created_at DESC'
  }[q.sort] || 'i.created_at DESC';

  const page = Math.max(1, Number(q.page) || 1);
  const limit = 24;

  const [count] = await query(
    `
      SELECT COUNT(*) total
      FROM items i
      JOIN users u ON u.id = i.owner_id
      WHERE ${where.join(' AND ')}
    `,
    args
  );

  const rows = await query(
    `
      SELECT
        ${columns},
        EXISTS (
          SELECT 1
          FROM favorites f
          WHERE f.item_id = i.id
          AND f.user_id = ?
        ) saved
      FROM items i
      JOIN users u ON u.id = i.owner_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${sort}
      LIMIT 24
      OFFSET ${Math.min(100000, (page - 1) * limit)}
    `,
    [req.user?.id || 0, ...args]
  );

  ok(res, {
    items: rows,
    total: count.total,
    page,
    pages: Math.ceil(count.total / limit)
  });
}

/**
 * Get detailed information for a single item.
 */
export async function detail(req, res) {
  const [item] = await query(
    `
      SELECT
        ${columns},
        i.included,
        i.condition_notes,
        i.building,
        i.pickup_instructions,
        i.circle_id
      FROM items i
      JOIN users u ON u.id = i.owner_id
      WHERE i.id = ?
    `,
    [id(req.params.id)]
  );

  ensure(item, 404, 'Item not found');

  ensure(
    item.status === 'ACTIVE' ||
    req.user?.id === item.owner_id ||
    req.user?.role === 'ADMIN',
    404,
    'Item not found'
  );

  if (item.circle_id) {
    const m = await query(
      `
        SELECT user_id
        FROM circle_members
        WHERE circle_id = ?
        AND user_id = ?
      `,
      [item.circle_id, req.user?.id || 0]
    );

    ensure(m.length, 403, 'Circle members only');
  }

  const images = await query(
    `
      SELECT id, url, position
      FROM item_images
      WHERE item_id = ?
      ORDER BY position, id
    `,
    [item.id]
  );

  const rules = await query(
    'SELECT rule_text FROM item_rules WHERE item_id = ?',
    [item.id]
  );

  const availability = await query(
    `
      SELECT start_time, end_time
      FROM item_availability
      WHERE item_id = ?
    `,
    [item.id]
  );

  const reservations = await query(
    `
      SELECT
        r.start_time,
        t.expected_return end_time
      FROM transactions t
      JOIN borrow_requests r ON r.id = t.request_id
      WHERE t.item_id = ?
      AND t.status NOT IN ('COMPLETED', 'CANCELLED')
    `,
    [item.id]
  );

  await query(
    'UPDATE items SET views = views + 1 WHERE id = ?',
    [item.id]
  );

  ok(res, {
    ...item,
    images,
    rules: rules.map(x => x.rule_text),
    availability,
    reservations
  });
}

/**
 * Validate and prepare item form values.
 * Includes borrowing fee and security deposit.
 */
function values(b) {
  ensure(categories.includes(b.category), 400, 'Choose a category');

  ensure(
    ['NEW', 'EXCELLENT', 'GOOD', 'USED'].includes(b.condition),
    400,
    'Choose a condition'
  );

  const hours = Number(b.maxDuration || 168);

  ensure(
    Number.isInteger(hours) && hours >= 1 && hours <= 720,
    400,
    'Maximum duration must be 1–720 hours'
  );

  const borrowingFee = validateMoney(
    b.borrowingFee,
    'Borrowing fee'
  );

  const securityDeposit = validateMoney(
    b.securityDeposit,
    'Security deposit'
  );

  return [
    text(b.name, 'Item name', 140),
    text(b.category, 'Category', 40),
    String(b.subcategory || '').slice(0, 60),
    text(b.description, 'Description', 5000, 20),
    b.condition,
    String(b.conditionNotes || '').slice(0, 2000),
    text(b.location, 'Pickup location', 150),
    String(b.building || '').slice(0, 100),
    String(b.pickupInstructions || '').slice(0, 2000),
    String(b.included || '').slice(0, 2000),
    hours,
    borrowingFee,
    securityDeposit
  ];
}

/**
 * Create or update an item.
 */
export async function save(req, res) {
  const v = values(req.body);

  const result = await atomic(async db => {
    let itemId;

    if (req.params.id) {
      // Update existing item
      itemId = id(req.params.id);

      const [item] = await query(
        'SELECT owner_id FROM items WHERE id = ? FOR UPDATE',
        [itemId],
        db
      );

      ensure(
        item?.owner_id === req.user.id,
        403,
        'Only the owner can edit this item'
      );

      await query(
        `
          UPDATE items
          SET
            name = ?,
            category = ?,
            subcategory = ?,
            description = ?,
            item_condition = ?,
            condition_notes = ?,
            location = ?,
            building = ?,
            pickup_instructions = ?,
            included = ?,
            max_borrow_duration = ?,
            borrowing_fee = ?,
            security_deposit = ?
          WHERE id = ?
        `,
        [...v, itemId],
        db
      );
    } else {
      // Create new item
      const r = await query(
        `
          INSERT INTO items (
            name,
            category,
            subcategory,
            description,
            item_condition,
            condition_notes,
            location,
            building,
            pickup_instructions,
            included,
            max_borrow_duration,
            borrowing_fee,
            security_deposit,
            owner_id,
            slug
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          ...v,
          req.user.id,
          v[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')
        ],
        db
      );

      itemId = r.insertId;
    }

    // Circle membership
    if (req.body.circleId) {
      const circle = id(req.body.circleId);

      const [member] = await query(
        `
          SELECT user_id
          FROM circle_members
          WHERE circle_id = ?
          AND user_id = ?
        `,
        [circle, req.user.id],
        db
      );

      ensure(member, 403, 'Join the circle first');

      await query(
        'UPDATE items SET circle_id = ? WHERE id = ?',
        [circle, itemId],
        db
      );
    }

    // Item images
    if (req.body.images) {
      ensure(
        Array.isArray(req.body.images) &&
        req.body.images.length <= 6,
        400,
        'Up to six images'
      );

      await query(
        'DELETE FROM item_images WHERE item_id = ?',
        [itemId],
        db
      );

      for (const [position, uploadId] of req.body.images.entries()) {
        const [upload] = await query(
          `
            SELECT url, public_id
            FROM uploads
            WHERE id = ?
            AND user_id = ?
          `,
          [id(uploadId), req.user.id],
          db
        );

        ensure(upload, 400, 'Upload the selected images first');

        await query(
          `
            INSERT INTO item_images (
              item_id,
              url,
              public_id,
              position
            )
            VALUES (?, ?, ?, ?)
          `,
          [itemId, upload.url, upload.public_id, position],
          db
        );
      }
    }

    // Item rules
    if (req.body.rules) {
      ensure(
        Array.isArray(req.body.rules) &&
        req.body.rules.length <= 15,
        400,
        'Up to 15 rules'
      );

      await query(
        'DELETE FROM item_rules WHERE item_id = ?',
        [itemId],
        db
      );

      for (const rule of req.body.rules) {
        await query(
          'INSERT INTO item_rules(item_id, rule_text) VALUES (?, ?)',
          [itemId, text(rule, 'Rule', 300)],
          db
        );
      }
    }

    // Item availability
    if (req.body.availableStart && req.body.availableEnd) {
      const start = date(req.body.availableStart);
      const end = date(req.body.availableEnd);

      ensure(end > start, 400, 'Invalid availability');

      await query(
        'DELETE FROM item_availability WHERE item_id = ?',
        [itemId],
        db
      );

      await query(
        `
          INSERT INTO item_availability (
            item_id,
            start_time,
            end_time
          )
          VALUES (?, ?, ?)
        `,
        [itemId, start, end],
        db
      );
    }

    return { id: itemId };
  });

  ok(res, result, req.params.id ? 200 : 201);
}

/**
 * Get items owned by the logged-in user.
 */
export async function mine(req, res) {
  ok(
    res,
    await query(
      `
        SELECT
          ${columns},
          (
            SELECT COUNT(*)
            FROM borrow_requests
            WHERE item_id = i.id
          ) requests,
          (
            SELECT COUNT(*)
            FROM transactions
            WHERE item_id = i.id
            AND status = 'COMPLETED'
          ) borrows
        FROM items i
        JOIN users u ON u.id = i.owner_id
        WHERE i.owner_id = ?
        AND i.status <> 'DELETED'
        ORDER BY i.created_at DESC
      `,
      [req.user.id]
    )
  );
}

/**
 * Change item status or delete an item.
 */
export async function status(req, res) {
  const state = req.method === 'DELETE'
    ? 'DELETED'
    : req.body.status;

  ensure(
    ['ACTIVE', 'UNAVAILABLE', 'DRAFT', 'ARCHIVED', 'DELETED'].includes(state),
    400,
    'Invalid item status'
  );

  await atomic(async db => {
    const [item] = await query(
      'SELECT owner_id FROM items WHERE id = ? FOR UPDATE',
      [id(req.params.id)],
      db
    );

    ensure(
      item?.owner_id === req.user.id,
      403,
      'Only the owner can manage this item'
    );

    const active = await query(
      `
        SELECT id
        FROM transactions
        WHERE item_id = ?
        AND status NOT IN ('COMPLETED', 'CANCELLED')
      `,
      [id(req.params.id)],
      db
    );

    ensure(
      !active.length,
      409,
      'Finish active reservations before changing availability'
    );

    await query(
      'UPDATE items SET status = ? WHERE id = ?',
      [state, id(req.params.id)],
      db
    );
  });

  ok(res, { status: state });
}
