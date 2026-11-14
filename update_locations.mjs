import('./server/src/config/db.js').then(async ({ pool }) => {
  const updates = [
    ["UPDATE items SET location='Academic Block' WHERE location='North Campus'", 'North Campus -> Academic Block'],
    ["UPDATE items SET location='Hostels' WHERE location='South Campus'", 'South Campus -> Hostels'],
    ["UPDATE items SET location='Sports Complex' WHERE location='Hostel Zone'", 'Hostel Zone -> Sports Complex'],
    ["UPDATE users SET hostel='BML Munjal Campus' WHERE hostel IN ('North Campus','South Campus','Hostel Zone')", 'User hostels'],
    ["UPDATE users SET university='BML Munjal University' WHERE university='Delhi Technological University'", 'User universities'],
  ];
  for (const [sql, label] of updates) {
    const [r] = await pool.execute(sql);
    console.log(label + ':', r.affectedRows, 'rows');
  }
  console.log('Done!');
  pool.end();
}).catch(e => { console.error(e.message); process.exit(1); });
