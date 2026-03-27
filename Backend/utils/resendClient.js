const nodemailer = require('nodemailer');

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 🔁 SAME INTERFACE AS RESEND
const resend = {
  emails: {
    send: async ({ from, to, subject, html }) => {
      try {
        const info = await transporter.sendMail({
          from,
          to,
          subject,
          html
        });

        console.log('✅ Email sent:', info.messageId);

        return {
          data: info,
          error: null
        };
      } catch (error) {
        console.error('❌ Email error:', error);

        return {
          data: null,
          error
        };
      }
    }
  }
};

module.exports = { resend };