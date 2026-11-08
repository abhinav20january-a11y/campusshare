import {query} from '../config/db.js';
import {sendEmail} from './email.js';
import {awardBadges} from './badges.js';

export const notify=(db,user,type,title,link)=>{
  // Insert in‑app notification
  query('INSERT INTO notifications(user_id,type,title,link) VALUES(?,?,?,?)',[user,type,title,link],db);
  // Send email if email config present and type is important
  const emailEnv = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;
  if (emailEnv) {
    // Simple mapping of notification types to email subjects
    const subjectMap = {
      'REQUEST_RECEIVED': 'New borrow request received',
      'REQUEST_ACCEPTED': 'Your borrow request was accepted',
      'OVERDUE': 'Item overdue reminder',
      'BADGE_EARNED': 'Congratulations! You earned a badge',
      'AVAILABILITY_ALERT': 'Item you saved is now available'
    };
    const subject = subjectMap[type] || 'CampusShare notification';
    // Assume we can fetch the user's email via a helper query (async not awaited here for fire‑and‑forget)
    query('SELECT email FROM users WHERE id=?',[user]).then(([u])=>{
      if (u && u.email) {
        sendEmail(u.email, subject, `<p>${title}</p><p>Visit: <a href="${link}">${link}</a></p>`);
      }
    }).catch(e=>console.error('Email send failed:',e.message));
  }
};
export const event=(db,tx,actor,state,note='')=>query('INSERT INTO transaction_events(transaction_id,actor_id,state,note) VALUES(?,?,?,?)',[tx,actor,state,note],db);
export const audit=(db,admin,action,targetType,targetId,reason)=>query('INSERT INTO audit_logs(admin_id,action,target_type,target_id,reason) VALUES(?,?,?,?,?,?)',[admin,action,targetType,targetId,reason],db);
export async function updateTrust(db,user){const [stats]=await query(`SELECT (SELECT COUNT(*) FROM transactions WHERE (owner_id=? OR borrower_id=?) AND status='COMPLETED') completed,(SELECT AVG(rating) FROM reviews WHERE reviewed_user_id=?) rating,(SELECT COUNT(*) FROM transactions WHERE borrower_id=? AND actual_return>expected_return) late,(SELECT COUNT(*) FROM borrow_requests WHERE borrower_id=? AND status='CANCELLED') cancelled,(SELECT COUNT(*) FROM disputes d JOIN transactions t ON t.id=d.transaction_id WHERE (t.owner_id=? OR t.borrower_id=?) AND d.status='RESOLVED') disputes`,[user,user,user,user,user,user,user],db);const score=stats.completed?Math.max(0,Math.min(100,60+Math.min(20,stats.completed*2)+(stats.rating||4)*4-stats.late*3-stats.cancelled-stats.disputes*2)):50;await query('UPDATE users SET trust_score=?,average_rating=? WHERE id=?',[score,stats.rating||0,user],db);await awardBadges(db,user).catch(e=>console.error('Badge check failed:',e.message));}
