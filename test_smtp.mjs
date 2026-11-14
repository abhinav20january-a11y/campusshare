import './server/src/config/env.js';
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: Number(process.env.MAIL_PORT) === 465,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

console.log('Testing SMTP config:');
console.log('  Host :', process.env.MAIL_HOST);
console.log('  Port :', process.env.MAIL_PORT);
console.log('  User :', process.env.MAIL_USER);
console.log('  From :', process.env.MAIL_FROM);
console.log('');

try {
  await transport.verify();
  console.log('✅ SMTP connection verified successfully!');

  const info = await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: process.env.MAIL_USER,          // sends to yourself
    subject: '✅ CampusShare SMTP Test',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px">
        <h2 style="color:#2563eb">CampusShare 🎓</h2>
        <p>Your SMTP setup is working perfectly!</p>
        <p style="color:#555">If you received this email, all transaction notifications will be delivered correctly.</p>
        <hr/>
        <small style="color:#999">Sent at ${new Date().toLocaleString()}</small>
      </div>
    `,
  });
  console.log('✅ Test email sent! Message ID:', info.messageId);
  console.log('   Check your inbox at:', process.env.MAIL_USER);
} catch (err) {
  console.error('❌ SMTP Error:', err.message);
  if (err.message.includes('Invalid login') || err.message.includes('535')) {
    console.error('   → Gmail credentials are incorrect or App Password is needed.');
    console.error('   → Go to: https://myaccount.google.com/apppasswords');
    console.error('   → Generate an App Password and use that as MAIL_PASS in your .env');
  }
  if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
    console.error('   → Cannot reach SMTP server. Check MAIL_HOST and MAIL_PORT.');
  }
}
