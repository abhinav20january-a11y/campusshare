import './env.js';
import mysql from 'mysql2/promise';
export const pool=mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3308),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'campusshare',connectionLimit:10,waitForConnections:true,timezone:'Z',dateStrings:true,decimalNumbers:true});
export async function query(sql,args=[],db=pool){return (await db.execute(sql,args))[0]}
export async function atomic(fn){const db=await pool.getConnection();try{await db.beginTransaction();const value=await fn(db);await db.commit();return value}catch(e){await db.rollback();throw e}finally{db.release()}}
