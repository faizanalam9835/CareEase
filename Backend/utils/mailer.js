const nodemailer = require('nodemailer');
const config = require('../config/env');

/**
 * Mail transport with a safe fallback.
 *
 * When SMTP credentials are not configured the mailer logs the message to the
 * console and reports success. That keeps registration, user creation and
 * appointment booking fully working on a demo machine with no mail account -
 * previously a missing EMAIL_USER made those requests hang for 30s and fail.
 */
let transporter = null;

if (config.email.enabled) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: config.email.user, pass: config.email.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

const sendMail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.log('\n[mail:console] ---------------------------------------------');
    console.log(`  to      : ${to}`);
    console.log(`  subject : ${subject}`);
    console.log('  (SMTP not configured - set EMAIL_USER/EMAIL_PASS to send for real)');
    console.log('[mail:console] ---------------------------------------------\n');
    return { success: true, delivered: false, mode: 'console' };
  }

  try {
    const info = await transporter.sendMail({
      from: `${config.email.fromName} <${config.email.user}>`,
      to,
      subject,
      html
    });
    return { success: true, delivered: true, messageId: info.messageId };
  } catch (error) {
    // Mail is never allowed to fail the request that triggered it.
    console.error('[mail] delivery failed:', error.message);
    return { success: false, delivered: false, error: error.message };
  }
};

/** Fire-and-forget helper for mail that must not block the HTTP response. */
const sendMailAsync = (payload) => {
  setImmediate(() => {
    sendMail(payload).catch((error) => console.error('[mail] unexpected:', error.message));
  });
};

module.exports = { sendMail, sendMailAsync };
