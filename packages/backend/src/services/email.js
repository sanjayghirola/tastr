import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

let transporter = null;

// ─── Initialise transporter (call once at startup) ────────────────────────────
export function initEmail() {
  const {
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
    SMTP_FROM_NAME, SMTP_FROM_EMAIL,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    logger.warn('⚠️  SMTP not configured — emails will be logged to console only');
    return;
  }

  transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,   // true for port 465 (SSL), false for STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  transporter.verify((err) => {
    if (err) logger.error('SMTP connection error:', err.message);
    else     logger.info('✅  SMTP transporter ready');
  });
}

// ─── Core send helper ─────────────────────────────────────────────────────────
export async function sendMail({ to, subject, html, text }) {
  const from = `"${process.env.SMTP_FROM_NAME || 'Tastr'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@tastr.app'}>`;

  if (!transporter) {
    // Dev fallback — log to console
    logger.info(`📧 [EMAIL - DEV] To: ${to} | Subject: ${subject}`);
    logger.info(`📧 [EMAIL - DEV] Body: ${text || 'HTML email'}`);
    return;
  }

  try {
    const info = await transporter.sendMail({ from, to, subject, html, text });
    logger.info(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`📧 Email failed to ${to}: ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  RESTAURANT EMAILS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Application received
export async function sendRegistrationConfirmation({ to, restaurantName, ownerName }) {
  await sendMail({
    to,
    subject: 'Tastr — Your application has been received',
    text: `Hi ${ownerName},\n\nThank you for registering "${restaurantName}" with Tastr.\n\nOur team will review your documents and get back to you within 1–3 business days.\n\nBest,\nThe Tastr Team`,
    html: emailWrapper(`
      <h2>Application Received</h2>
      <p>Hi <strong>${ownerName}</strong>,</p>
      <p>Thank you for registering <strong>${restaurantName}</strong> with Tastr.</p>
      <p>Our team will review your documents and get back to you within <strong>1–3 business days</strong>.</p>
      <p>You can check your application status by logging in to the <a href="${process.env.RESTAURANT_WEB_URL || 'http://localhost:3001'}">Tastr Partner Portal</a>.</p>
    `),
  });
}

// 2. Application approved
export async function sendRestaurantApproved({ to, restaurantName, ownerName }) {
  const portalUrl = process.env.RESTAURANT_WEB_URL || 'http://localhost:3001';
  await sendMail({
    to,
    subject: '🎉 Tastr — Your restaurant has been approved!',
    text: `Hi ${ownerName},\n\nGreat news! "${restaurantName}" has been approved and is now live on Tastr.\n\nLog in to your dashboard: ${portalUrl}\n\nBest,\nThe Tastr Team`,
    html: emailWrapper(`
      <h2 style="color:#C18B3C">🎉 You're approved!</h2>
      <p>Hi <strong>${ownerName}</strong>,</p>
      <p>Great news! <strong>${restaurantName}</strong> has been approved and is now live on Tastr.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${portalUrl}" style="${btnStyle}">Go to Dashboard →</a>
      </p>
      <p>Welcome to the Tastr family!</p>
    `),
  });
}

// 3. Application rejected
export async function sendRestaurantRejected({ to, restaurantName, ownerName, reason }) {
  await sendMail({
    to,
    subject: 'Tastr — Update on your restaurant application',
    text: `Hi ${ownerName},\n\nWe were unable to approve "${restaurantName}" at this time.\n\nReason: ${reason || 'Please contact support for details.'}\n\nIf you have questions, please contact support@tastr.app.\n\nBest,\nThe Tastr Team`,
    html: emailWrapper(`
      <h2>Application Update</h2>
      <p>Hi <strong>${ownerName}</strong>,</p>
      <p>We were unable to approve <strong>${restaurantName}</strong> at this time.</p>
      ${reason ? `<div style="background:#fff3f3;border-left:4px solid #ef4444;padding:12px 16px;border-radius:8px;margin:16px 0"><strong>Reason:</strong> ${reason}</div>` : ''}
      <p>If you have questions or would like to appeal this decision, please contact us at <a href="mailto:support@tastr.app">support@tastr.app</a>.</p>
    `),
  });
}

// 4. Document rejected + reupload link
export async function sendDocumentReuploadRequest({ to, restaurantName, ownerName, rejectedDocs, reuploadLink }) {
  const docList = rejectedDocs.map(d =>
    `<li style="margin:6px 0"><strong>${d.label}</strong>${d.rejectionReason ? `: <span style="color:#ef4444">${d.rejectionReason}</span>` : ''}</li>`
  ).join('');

  await sendMail({
    to,
    subject: 'Tastr — Action required: Please re-upload rejected documents',
    text: `Hi ${ownerName},\n\nSome documents for "${restaurantName}" have been rejected and need to be re-uploaded.\n\nRejected documents:\n${rejectedDocs.map(d => `- ${d.label}${d.rejectionReason ? ': ' + d.rejectionReason : ''}`).join('\n')}\n\nClick the link below to re-upload:\n${reuploadLink}\n\nThis link is valid for 48 hours.\n\nBest,\nThe Tastr Team`,
    html: emailWrapper(`
      <h2>Action Required: Document Re-upload</h2>
      <p>Hi <strong>${ownerName}</strong>,</p>
      <p>The following documents for <strong>${restaurantName}</strong> have been rejected and need to be re-uploaded:</p>
      <ul style="background:#fff8f0;border-left:4px solid #C18B3C;padding:12px 16px 12px 32px;border-radius:8px;margin:16px 0">
        ${docList}
      </ul>
      <p style="text-align:center;margin:24px 0">
        <a href="${reuploadLink}" style="${btnStyle}">Re-upload Documents →</a>
      </p>
      <p style="font-size:12px;color:#999">This link is valid for 48 hours. If it has expired, please contact support.</p>
    `),
  });
}

// 5. Document re-submitted (notify admin — optional)
export async function sendDocumentResubmitted({ restaurantName, docLabel }) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;
  await sendMail({
    to: adminEmail,
    subject: `Tastr Admin — Document re-submitted: ${restaurantName}`,
    text: `A document has been re-submitted for review.\n\nRestaurant: ${restaurantName}\nDocument: ${docLabel}\n\nPlease review in the admin portal.`,
    html: emailWrapper(`
      <h2>Document Re-submitted</h2>
      <p>A document has been re-submitted for review.</p>
      <p><strong>Restaurant:</strong> ${restaurantName}<br/><strong>Document:</strong> ${docLabel}</p>
      <p><a href="${process.env.ADMIN_WEB_URL || 'http://localhost:3002'}/restaurants">Review in Admin Portal →</a></p>
    `),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const btnStyle = 'display:inline-block;background:#C18B3C;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:14px';

function emailWrapper(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#333">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <!-- Header -->
        <tr><td style="background:#C18B3C;border-radius:16px 16px 0 0;padding:24px 32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;letter-spacing:-0.5px">Tastr</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px">Partner Portal</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border-radius:0 0 16px 16px;line-height:1.6">
          ${body}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="font-size:12px;color:#999;margin:0">© ${new Date().getFullYear()} Tastr Ltd. All rights reserved.<br>
          You're receiving this email because you registered a restaurant with Tastr.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
