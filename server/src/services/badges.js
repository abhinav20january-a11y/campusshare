import { query } from '../config/db.js';
import { notify } from './events.js';

// ─── Badge definitions ────────────────────────────────────────────────────────
// Each badge has: id (stored in DB), label (shown in UI), icon (emoji),
// description (tooltip), and a check(stats) function that returns true to award.

export const BADGES = [
  {
    id: 'FIRST_BORROW',
    label: 'First Borrow',
    icon: '🎉',
    description: 'Completed your very first borrow exchange.',
    check: (s) => s.completed_borrows >= 1,
  },
  {
    id: 'FIRST_LEND',
    label: 'First Lend',
    icon: '🤝',
    description: 'Successfully lent an item for the first time.',
    check: (s) => s.successful_lends >= 1,
  },
  {
    id: 'TRUSTED_LENDER',
    label: 'Trusted Lender',
    icon: '🏅',
    description: 'Completed 5 or more successful lends.',
    check: (s) => s.successful_lends >= 5,
  },
  {
    id: 'POWER_SHARER',
    label: 'Power Sharer',
    icon: '🏆',
    description: 'Completed 10 or more total exchanges as borrower or lender.',
    check: (s) => s.completed_borrows + s.successful_lends >= 10,
  },
  {
    id: 'FIVE_STAR',
    label: 'Five Star',
    icon: '⭐',
    description: 'Received an average rating of 5.0 stars across at least 3 reviews.',
    check: (s) => s.review_count >= 3 && Number(s.average_rating) === 5,
  },
  {
    id: 'HIGHLY_RATED',
    label: 'Highly Rated',
    icon: '💎',
    description: 'Maintained an average rating of 4.5 or above across 5+ reviews.',
    check: (s) => s.review_count >= 5 && Number(s.average_rating) >= 4.5,
  },
  {
    id: 'ZERO_DISPUTES',
    label: 'Zero Disputes',
    icon: '🛡️',
    description: 'Completed 5 or more exchanges with absolutely no disputes.',
    check: (s) => s.completed_borrows + s.successful_lends >= 5 && s.disputes === 0,
  },
  {
    id: 'ON_TIME_HERO',
    label: 'On Time Hero',
    icon: '⚡',
    description: 'Returned every item on time across 5+ completed borrows.',
    check: (s) => s.completed_borrows >= 5 && s.late_returns === 0,
  },
  {
    id: 'COMMUNITY_BUILDER',
    label: 'Community Builder',
    icon: '🌐',
    description: 'Created a Borrow Circle that has 3 or more members.',
    check: (s) => s.circles_owned_with_members >= 1,
  },
  {
    id: 'GENEROUS_SHARER',
    label: 'Generous Sharer',
    icon: '💝',
    description: 'Listed 5 or more active items on the marketplace.',
    check: (s) => s.items_listed >= 5,
  },
];

// ─── Award badges for a user ──────────────────────────────────────────────────
// Called after every completed transaction. Checks all badge conditions
// and inserts any newly earned badges. Sends a notification for each new badge.

export async function awardBadges(db, userId) {
  // 1. Gather all stats needed for badge checks in a single query
  const [stats] = await query(
    `SELECT
      SUM(borrower_id = ? AND status = 'COMPLETED')                        AS completed_borrows,
      SUM(owner_id   = ? AND status = 'COMPLETED')                        AS successful_lends,
      SUM(borrower_id = ? AND status = 'COMPLETED'
          AND actual_return > expected_return)                              AS late_returns,
      (SELECT COUNT(*) FROM disputes d
         JOIN transactions t ON t.id = d.transaction_id
         WHERE (t.owner_id = ? OR t.borrower_id = ?)
           AND d.status = 'RESOLVED')                                      AS disputes,
      (SELECT COUNT(*) FROM reviews WHERE reviewed_user_id = ?)           AS review_count,
      (SELECT AVG(rating)  FROM reviews WHERE reviewed_user_id = ?)       AS average_rating,
      (SELECT COUNT(*) FROM items
         WHERE owner_id = ? AND status = 'ACTIVE')                         AS items_listed,
      (SELECT COUNT(*) FROM circles c
         WHERE c.owner_id = ?
           AND (SELECT COUNT(*) FROM circle_members cm WHERE cm.circle_id = c.id) >= 3
      )                                                                     AS circles_owned_with_members
    FROM transactions
    WHERE owner_id = ? OR borrower_id = ?`,
    [
      userId, userId, userId,
      userId, userId,
      userId, userId,
      userId,
      userId,
      userId, userId,
    ],
    db
  );

  // 2. Fetch badges the user already has
  const existing = await query(
    'SELECT badge FROM user_badges WHERE user_id = ?',
    [userId],
    db
  );
  const alreadyHas = new Set(existing.map((r) => r.badge));

  // 3. Check each badge and award new ones
  const newBadges = [];
  for (const badge of BADGES) {
    if (alreadyHas.has(badge.id)) continue;       // already earned
    if (!badge.check(stats)) continue;            // condition not met

    // Insert the new badge
    await query(
      'INSERT IGNORE INTO user_badges(user_id, badge) VALUES(?, ?)',
      [userId, badge.id],
      db
    );

    // Send an in-app notification
    await notify(
      db,
      userId,
      'BADGE_EARNED',
      `${badge.icon} You earned the "${badge.label}" badge!`,
      '/profile'
    );

    newBadges.push(badge.id);
  }

  return newBadges; // returns array of newly awarded badge IDs
}

// ─── Get all badges for a user ────────────────────────────────────────────────
// Returns both earned badges (with earned_at date) and locked badges,
// so the frontend can show a full badge showcase with lock icons.

export async function getUserBadges(userId) {
  const earned = await query(
    'SELECT badge, created_at AS earned_at FROM user_badges WHERE user_id = ? ORDER BY created_at',
    [userId]
  );

  const earnedSet = new Set(earned.map((r) => r.badge));

  return BADGES.map((b) => {
    const record = earned.find((r) => r.badge === b.id);
    return {
      id: b.id,
      label: b.label,
      icon: b.icon,
      description: b.description,
      earned: earnedSet.has(b.id),
      earned_at: record?.earned_at ?? null,
    };
  });
}
