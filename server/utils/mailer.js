import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

// SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: Number(process.env.MAIL_PORT) === 465,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

/**
 * Generate PDF receipt
 */
function generateReceiptPdf(tx) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(20)
      .text('CampusShare Receipt', { align: 'center' });

    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Transaction ID: ${tx.id}`);
    doc.text(`Amount: ${tx.amount ?? 'N/A'} ${tx.currency ?? ''}`);
    doc.text(`Status: ${tx.status}`);
    doc.text(
      `Date: ${tx.created_at
        ? new Date(tx.created_at).toLocaleString()
        : new Date().toLocaleString()}`
    );

    doc.end();
  });
}

/**
 * Send email with optional PDF receipt
 */
export async function sendMail({
  to,
  subject,
  html,
  attachPdf
}) {
  if (
    !process.env.MAIL_HOST ||
    !process.env.MAIL_USER ||
    !process.env.MAIL_PASS
  ) {
    throw new Error('SMTP environment variables are missing');
  }

  const mailOptions = {
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    html
  };

  if (attachPdf) {
    const pdfBuffer = await generateReceiptPdf(attachPdf);

    mailOptions.attachments = [{
      filename: `receipt-${attachPdf.id}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }];
  }

  return await transporter.sendMail(mailOptions);
}

export default { sendMail };