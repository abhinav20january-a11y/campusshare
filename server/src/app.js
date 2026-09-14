import './config/env.js';
import express from 'express';import helmet from 'helmet';import cors from 'cors';import cookieParser from 'cookie-parser';import compression from 'compression';import {rateLimit} from 'express-rate-limit';import {fileURLToPath} from 'node:url';import {existsSync} from 'node:fs';
import {router} from './routes/index.js';import {production} from './config/env.js';
import {demoPayments} from './routes/demoPayments.js';
import {razorpayRoutes} from './routes/razorpay.js';
export const app=express();app.disable('x-powered-by');
router.use('/transactions',demoPayments);
router.use('/transactions',razorpayRoutes);
const origins=(process.env.CLIENT_URL||'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001').split(',');
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],imgSrc:["'self'",'data:','blob:','https://res.cloudinary.com'],styleSrc:["'self'","'unsafe-inline'"],scriptSrc:["'self'",'https://checkout.razorpay.com'],connectSrc:["'self'",'https://api.razorpay.com'],frameSrc:["'self'",'https://api.razorpay.com','https://checkout.razorpay.com'],objectSrc:["'none'"]}}}));app.use(cors({origin:(origin,cb)=>cb(null,!origin||origins.includes(origin)),credentials:true}));app.use((req,res,next)=>{if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&!origins.includes(req.headers.origin))return res.status(403).json({success:false,message:'Origin not permitted'});next()});app.use(compression());app.use(express.json({limit:'128kb'}));app.use(cookieParser());app.use('/api',rateLimit({windowMs:60000,limit:300,standardHeaders:'draft-8',legacyHeaders:false}),router);app.use('/api',(req,res)=>res.status(404).json({success:false,message:'API endpoint not found'}));
app.use('/assets',express.static(fileURLToPath(new URL('../../public/assets',import.meta.url)),{maxAge:'7d'}));
app.use('/404',express.static(fileURLToPath(new URL('../../public/404',import.meta.url))));
const client=fileURLToPath(new URL('../../client/dist',import.meta.url));if(existsSync(client)){app.use(express.static(client));app.get('/{*path}',(req,res)=>res.sendFile(client+'/index.html'))}
app.use((err,req,res,next)=>{console.error(err.code||err.message);const status=err.status|| (err.code==='LIMIT_FILE_SIZE'?400:500);res.status(status).json({success:false,message:status<500?err.message:'The service could not complete your request. Please try again.'})});
