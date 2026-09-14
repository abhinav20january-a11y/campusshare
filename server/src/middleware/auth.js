import jwt from 'jsonwebtoken';
import {jwtSecret} from '../config/env.js';
import {query} from '../config/db.js';
import {ensure,publicUser} from '../utils/core.js';
export async function authenticateUser(req,res,next){try{const token=req.cookies?.campusshare||req.headers.authorization?.replace(/^Bearer /,'');ensure(token,401,'Please sign in');let payload;try{payload=jwt.verify(token,jwtSecret,{algorithms:['HS256']})}catch{ensure(false,401,'Your session has expired')};const rows=await query(`SELECT ${publicUser},token_version FROM users WHERE id=?`,[payload.sub]);const u=rows[0];ensure(u&&u.token_version===payload.v,401,'Please sign in again');ensure(u.status==='ACTIVE',403,'Your account is not active');req.user=u;next()}catch(e){next(e)}}
export function requireAdmin(req,res,next){try{ensure(req.user.role==='ADMIN',403,'Administrator access required');next()}catch(e){next(e)}}
export function verified(req,res,next){try{ensure(req.user.verified,403,'Verify your college email first');next()}catch(e){next(e)}}
