import {Router} from 'express';
import {randomUUID} from 'node:crypto';
import {authenticateUser} from '../middleware/auth.js';
import {query,atomic} from '../config/db.js';
import {wrap,ok,ensure,id} from '../utils/core.js';
export const demoPayments=Router();
demoPayments.use(authenticateUser);
demoPayments.get('/:id/demo-payment',wrap(async(req,res)=>{const [t]=await query('SELECT owner_id,borrower_id FROM transactions WHERE id=?',[id(req.params.id)]);ensure(t&&(t.owner_id===req.user.id||t.borrower_id===req.user.id),403,'Exchange participant access required');const [receipt]=await query('SELECT reference,created_at FROM demo_payments WHERE transaction_id=?',[id(req.params.id)]);ok(res,receipt||null)}));
demoPayments.post('/:id/demo-payment',wrap(async(req,res)=>{const receipt=await atomic(async db=>{const [t]=await query('SELECT id,borrower_id,status FROM transactions WHERE id=? FOR UPDATE',[id(req.params.id)],db);ensure(t?.borrower_id===req.user.id,403,'Only the borrower can run this demo');const [existing]=await query('SELECT reference,created_at FROM demo_payments WHERE transaction_id=?',[t.id],db);if(existing)return existing;ensure(['ACCEPTED','HANDOVER_PENDING'].includes(t.status),409,'The owner must accept before demo checkout');const reference='DEMO-'+randomUUID();await query('INSERT INTO demo_payments(transaction_id,reference) VALUES(?,?)',[t.id,reference],db);return {reference,created_at:new Date().toISOString()}});ok(res,receipt)}));
