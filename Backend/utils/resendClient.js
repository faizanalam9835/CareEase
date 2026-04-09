const dns = require('dns');
const nodemailer = require('nodemailer');

dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

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