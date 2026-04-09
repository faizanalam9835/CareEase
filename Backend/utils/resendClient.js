const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

const resend = {
  emails: {
    send: async ({ from, to, subject, html }) => {
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
    }
  }
};

module.exports = { resend };