import {app} from './app.js';import {pool} from './config/db.js';import {overdue} from './services/borrowing.js';
const server=app.listen(Number(process.env.PORT||3001),'127.0.0.1',()=>console.log(`CampusShare: http://localhost:${process.env.PORT||3001}`));
const timer=setInterval(()=>overdue().catch(e=>console.error('Overdue task:',e.code||e.message)),60000);timer.unref();overdue().catch(()=>{});
function shutdown(){clearInterval(timer);server.close(async()=>{await pool.end();process.exit(0)})}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
