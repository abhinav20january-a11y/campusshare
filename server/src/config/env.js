import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
dotenv.config({path:fileURLToPath(new URL('../../.env',import.meta.url)),quiet:true});
export const production=process.env.NODE_ENV==='production';
if(production&&(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32))throw Error('Production requires a JWT_SECRET of at least 32 characters');
export const jwtSecret=process.env.JWT_SECRET||randomBytes(48).toString('hex');
export const demoVerification=!production&&process.env.DEMO_VERIFICATION!=='false';
