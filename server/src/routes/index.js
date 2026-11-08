import {Router} from 'express';
import multer from 'multer';
import {rateLimit} from 'express-rate-limit';
import {authenticateUser as auth,requireAdmin,verified} from '../middleware/auth.js';
import {wrap,ok,ensure,id} from '../utils/core.js';
import {query} from '../config/db.js';
import * as account from '../controllers/authController.js';
import * as users from '../controllers/userController.js';
import * as badges from '../services/badges.js';
import * as transactions from '../controllers/transactionController.js';
import * as community from '../controllers/communityController.js';
import * as admin from '../controllers/adminController.js';
import * as borrow from '../services/borrowing.js';
import cloudinary from '../config/cloudinary.js';
export const router=Router();
const authLimit=rateLimit({windowMs:15*60000,limit:80,standardHeaders:'draft-8',legacyHeaders:false});
router.get('/health',wrap(async(req,res)=>{await query('SELECT 1');ok(res,{database:'connected'})}));
router.get('/categories',(req,res)=>ok(res,items.categories));
router.post('/auth/register',authLimit,wrap(account.register));router.post('/auth/login',authLimit,wrap(account.login));router.post('/auth/logout',auth,wrap(account.logout));router.post('/auth/forgot-password',authLimit,wrap(account.forgot));router.post('/auth/reset-password',authLimit,wrap((req,res)=>account.consume(req,res,'RESET')));router.post('/auth/verify-email',authLimit,wrap((req,res)=>account.consume(req,res,'VERIFY')));
// Public catalogue routes may use a signed-in identity, but a stale browser cookie
// must never make the public marketplace fail. This commonly happens after a local
// server restart because development JWT secrets are intentionally ephemeral.
const optional=(req,res,next)=>{
 const hasCookie=Boolean(req.cookies?.campusshare),hasBearer=Boolean(req.headers.authorization);
 if(!hasCookie&&!hasBearer)return next();
 auth(req,res,error=>{
  if(error?.status===401){if(hasCookie)res.clearCookie('campusshare',{path:'/'});return next()}
  next(error)
 });
};
router.get('/items',optional,wrap(items.list));router.get('/items/mine',auth,wrap(items.mine));router.get('/items/:id',optional,wrap(items.detail));router.post('/items',auth,verified,wrap(items.save));router.put('/items/:id',auth,verified,wrap(items.save));router.patch('/items/:id/status',auth,wrap(items.status));router.delete('/items/:id',auth,wrap(items.status));
router.get('/users/me',auth,wrap(users.me));router.put('/users/me',auth,wrap(users.update));router.post('/users/me/password',auth,wrap(users.password));router.get('/users/me/dashboard',auth,wrap(users.dashboard));router.get('/users/:id/badges',auth,wrap(async(req,res)=>{const list=await badges.getUserBadges(req.params.id);ok(res,list)}));router.get('/users/:id/reviews',wrap(async(req,res)=>ok(res,await query('SELECT r.id,r.rating,r.comment,r.created_at,u.name reviewer_name FROM reviews r JOIN users u ON u.id=r.reviewer_id WHERE reviewed_user_id=? ORDER BY r.id DESC LIMIT 50',[id(req.params.id)]))));
router.delete('/users/me',auth,wrap(async(req,res)=>{const active=await query("SELECT id FROM transactions WHERE (owner_id=? OR borrower_id=?) AND status NOT IN ('COMPLETED','CANCELLED')",[req.user.id,req.user.id]);ensure(!active.length,409,'Complete active exchanges before deleting your account');await query("UPDATE users SET status='DELETED',token_version=token_version+1 WHERE id=?",[req.user.id]);ok(res,{message:'Account deactivated'})}));
router.post('/items/:id/favorite',auth,wrap(async(req,res)=>{const [i]=await query("SELECT id FROM items WHERE id=? AND status='ACTIVE'",[id(req.params.id)]);ensure(i,404,'Item not found');await query('INSERT IGNORE INTO favorites(user_id,item_id) VALUES(?,?)',[req.user.id,i.id]);ok(res,{saved:true})}));router.delete('/items/:id/favorite',auth,wrap(async(req,res)=>{await query('DELETE FROM favorites WHERE user_id=? AND item_id=?',[req.user.id,id(req.params.id)]);ok(res,{saved:false})}));router.get('/saved',auth,wrap(async(req,res)=>ok(res,await query("SELECT i.id,i.name,i.category,i.item_condition,i.location,u.name owner_name,u.average_rating,TRUE saved,(SELECT url FROM item_images WHERE item_id=i.id ORDER BY position LIMIT 1) image FROM favorites f JOIN items i ON i.id=f.item_id JOIN users u ON u.id=i.owner_id WHERE f.user_id=? AND i.status='ACTIVE'",[req.user.id]))));
router.post('/borrow-requests',auth,verified,wrap(async(req,res)=>ok(res,await borrow.createRequest(req.user,req.body),201)));router.get('/borrow-requests/mine',auth,wrap(transactions.requests));router.get('/borrow-requests/incoming',auth,wrap(transactions.requests));for(const action of ['accept','reject','cancel'])router.put(`/borrow-requests/:id/${action}`,auth,wrap(async(req,res)=>ok(res,await borrow.requestAction(req.user,req.params.id,action,req.body.reason))));
router.get('/transactions',auth,wrap(transactions.list));router.get('/transactions/:id',auth,wrap(transactions.detail));router.post('/transactions/:id/handover',auth,verified,wrap(async(req,res)=>ok(res,await borrow.handover(req.user,req.params.id,req.body))));router.post('/transactions/:id/return',auth,wrap(async(req,res)=>ok(res,await borrow.returnItem(req.user,req.params.id,req.body))));router.post('/transactions/:id/extension',auth,wrap(transactions.extension));router.post('/reviews',auth,wrap(transactions.review));
router.get('/conversations',auth,wrap(community.conversations));router.route('/conversations/:id/messages').get(auth,wrap(community.messages)).post(auth,wrap(community.messages));router.get('/notifications',auth,wrap(community.notifications));router.get('/notifications/unread-count',auth,wrap(community.notifications));router.put('/notifications/read-all',auth,wrap(community.notifications));router.put('/notifications/:id/read',auth,wrap(community.notifications));
router.route('/circles').get(auth,wrap(community.circles)).post(auth,verified,wrap(community.circles));router.get('/circles/:id',auth,wrap(community.circles));router.route('/circles/:id/members').post(auth,wrap(community.membership)).delete(auth,wrap(community.membership));router.post('/disputes',auth,wrap(community.dispute));router.get('/disputes/:id',auth,wrap(community.dispute));router.post('/reports',auth,wrap(community.report));
router.get('/items/:id/analytics',auth,wrap(async(req,res)=>{const [i]=await query('SELECT id,name,owner_id,views FROM items WHERE id=?',[id(req.params.id)]);ensure(i?.owner_id===req.user.id,403,'Owner access required');const rows=await query("SELECT DATE(created_at) day,COUNT(*) requests,SUM(status='ACCEPTED') accepted,SUM(status='COMPLETED') completed FROM borrow_requests WHERE item_id=? GROUP BY day ORDER BY day",[i.id]);const [f]=await query('SELECT COUNT(*) favorites FROM favorites WHERE item_id=?',[i.id]);ok(res,{...i,...f,activity:rows})}));
router.use('/admin',auth,requireAdmin);router.get('/admin/dashboard',wrap(admin.dashboard));router.get('/admin/analytics',wrap(admin.dashboard));router.get('/admin/:resource',wrap(admin.list));router.put('/admin/disputes/:id/resolve',wrap(admin.resolve));router.put('/admin/:resource/:id/status',wrap(admin.moderate));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1},fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
router.post('/uploads',auth,rateLimit({windowMs:60000,limit:15}),upload.single('image'),wrap(async(req,res)=>{ensure(req.file,400,'Choose a JPEG, PNG or WebP image under 5 MB');ensure(process.env.CLOUDINARY_API_SECRET,503,'Image uploads require Cloudinary configuration');const bytes=req.file.buffer;const jpeg=bytes[0]===255&&bytes[1]===216,png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),webp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';ensure(jpeg||png||webp,400,'Invalid image data');const result=await new Promise((resolve,reject)=>cloudinary.uploader.upload_stream({folder:`campusshare/${req.user.id}`,resource_type:'image',transformation:[{width:1600,height:1600,crop:'limit'},{quality:'auto',fetch_format:'auto'}]},(error,result)=>error?reject(error):resolve(result)).end(bytes));const record=await query('INSERT INTO uploads(user_id,url,public_id,kind) VALUES(?,?,?,?)',[req.user.id,result.secure_url,result.public_id,'IMAGE']);ok(res,{id:record.insertId,url:result.secure_url},201)}));
