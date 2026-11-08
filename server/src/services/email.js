import nodemailer from 'nodemailer';

/**
 * Send an email using environment configuration.
 *
 * Expected env vars:
 *   EMAIL_HOST – SMTP host
 *   EMAIL_PORT – SMTP port (numeric)
 *   EMAIL_USER – SMTP username
 *   EMAIL_PASS – SMTP password
 *   EMAIL_FROM – optional sender address (defaults to EMAIL_USER)
 */
export async function sendEmail(to, subject, html) {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || user;

  if (!host || !user || !pass) {
    console.warn('Email configuration missing – email not sent');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {user, pass},
  });

  const mailOptions = {
    from,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}
