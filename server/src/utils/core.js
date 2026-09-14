export class AppError extends Error{constructor(status,message){super(message);this.status=status}}
export function ensure(test,status,message){if(!test)throw new AppError(status,message)}
export function text(value,name,max=500,min=1){ensure(typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max,400,`${name} must be ${min}–${max} characters`);return value.trim()}
export function id(value){const n=Number(value);ensure(Number.isSafeInteger(n)&&n>0,400,'Invalid ID');return n}
export function date(value){const d=new Date(value);ensure(Number.isFinite(d.getTime()),400,'Invalid date');return d.toISOString().slice(0,19).replace('T',' ')}
export const publicUser='id,name,email,avatar,university,department,year,hostel,role,verified,status,onboarding_complete,interests,preferences,trust_score,average_rating,created_at';
export const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
export const ok=(res,data,status=200)=>res.status(status).json({success:true,data});
