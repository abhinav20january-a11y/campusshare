import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// ============================================
// SMTP TRANSPORTER
// ============================================

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: Number(process.env.MAIL_PORT) === 465,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function calculateDuration(start, end) {
  if (!start || !end) return 'Not available';

  const difference =
    new Date(end) - new Date(start);

  if (!Number.isFinite(difference) || difference <= 0) {
    return 'Not available';
  }

  const hours = Math.ceil(difference / 3600000);

  if (hours < 24) {
    return `${hours} hour(s)`;
  }

  const days = Math.ceil(hours / 24);

  return `${days} day(s)`;
}

function addSection(doc, heading) {
  doc.moveDown(0.8);

  doc.fontSize(13)
    .fillColor('#2563EB')
    .font('Helvetica-Bold')
    .text(heading);

  doc.moveDown(0.4);

  doc.moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor('#DBEAFE')
    .stroke();

  doc.moveDown(0.5);
}

function addDetail(doc, label, value) {
  doc.font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#64748B')
    .text(label.toUpperCase());

  doc.font('Helvetica')
    .fontSize(11)
    .fillColor('#1E293B')
    .text(String(value || 'Not available'));

  doc.moveDown(0.5);
}

// ============================================
// GENERATE PROFESSIONAL PDF RECEIPT
// ============================================

function generateReceiptPdf(tx) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 45,
        bottom: 45,
        left: 50,
        right: 50
      },
      bufferPages: true
    });

    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));

    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });

    doc.on('error', reject);

    // ========================================
    // HEADER
    // ========================================

    doc.rect(0, 0, 595, 115)
      .fill('#EFF6FF');

    const logoPath = process.env.CAMPUSSHARE_LOGO_PATH;

    if (logoPath) {
      try {
        const absoluteLogoPath = path.resolve(logoPath);

        if (fs.existsSync(absoluteLogoPath)) {
          doc.image(absoluteLogoPath, 50, 25, {
            fit: [55, 55]
          });
        }
      } catch (error) {
        console.error('Logo could not be loaded:', error.message);
      }
    }

    doc.fillColor('#1D4ED8')
      .font('Helvetica-Bold')
      .fontSize(24)
      .text('CampusShare', 50, 30, {
        align: 'center'
      });

    doc.fillColor('#475569')
      .font('Helvetica')
      .fontSize(10)
      .text('Campus Borrowing Confirmation', {
        align: 'center'
      });

    doc.fillColor('#1E293B')
      .font('Helvetica-Bold')
      .fontSize(17)
      .text('TRANSACTION RECEIPT', 50, 130, {
        align: 'center'
      });

    doc.moveDown(1.5);

    // ========================================
    // TRANSACTION DETAILS
    // ========================================

    addSection(doc, 'Transaction Information');

    addDetail(doc, 'Transaction ID', tx.id);

    addDetail(doc, 'Transaction Status', tx.status);

    addDetail(doc, 'Created On', formatDate(tx.created_at));

    // ========================================
    // ITEM DETAILS
    // ========================================

    addSection(doc, 'Item Information');

    addDetail(doc, 'Item Name', tx.item?.name);

    addDetail(doc, 'Category', tx.item?.category);

    addDetail(doc, 'Condition', tx.item?.item_condition);

    addDetail(doc, 'Location', tx.item?.location);

    // ========================================
    // BORROWER DETAILS
    // ========================================

    addSection(doc, 'Borrower Information');

    addDetail(doc, 'Borrower Name', tx.borrower?.name);

    addDetail(doc, 'Borrower Email', tx.borrower?.email);

    addDetail(doc, 'University', tx.borrower?.university);

    // ========================================
    // OWNER DETAILS
    // ========================================

    addSection(doc, 'Owner Information');

    addDetail(doc, 'Owner Name', tx.owner?.name);

    addDetail(doc, 'Owner Email', tx.owner?.email);

    addDetail(doc, 'University', tx.owner?.university);

    // ========================================
    // BORROWING PERIOD
    // ========================================

    addSection(doc, 'Borrowing Schedule');

    addDetail(doc, 'Start Date', formatDate(tx.start_date));

    addDetail(doc, 'Expected Return Date', formatDate(tx.end_date));

    addDetail(
      doc,
      'Duration',
      calculateDuration(tx.start_date, tx.end_date)
    );

    // ========================================
    // FOOTER
    // ========================================

    doc.moveDown(1.5);

    doc.rect(50, doc.y, 495, 1)
      .fill('#DBEAFE');

    doc.moveDown(1);

    doc.fontSize(9)
      .fillColor('#64748B')
      .font('Helvetica')
      .text(
        'This document confirms the acceptance of a borrowing request on CampusShare.',
        {
          align: 'center'
        }
      );

    doc.moveDown(0.5);

    doc.text(
      `Contact: ${
        process.env.CAMPUSSHARE_CONTACT_EMAIL ||
        process.env.MAIL_USER ||
        'CampusShare Support'
      }`,
      {
        align: 'center'
      }
    );

    doc.moveDown(0.5);

    doc.font('Helvetica-Bold')
      .fillColor('#2563EB')
      .text('Share more. Own less.', {
        align: 'center'
      });

    doc.end();
  });
}

// ============================================
// SEND EMAIL WITH PDF ATTACHMENT
// ============================================

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

  if (!to) {
    throw new Error('Recipient email address is required');
  }

  const mailOptions = {
    from:
      process.env.MAIL_FROM ||
      process.env.MAIL_USER,

    to,
    subject,
    html
  };

  if (attachPdf) {
    const pdfBuffer = await generateReceiptPdf(attachPdf);

    mailOptions.attachments = [
      {
        filename: `CampusShare-Receipt-${attachPdf.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];
  }

  return await transporter.sendMail(mailOptions);
}

export default {
  sendMail
};