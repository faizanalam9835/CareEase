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


const sendWelcomeEmail = async (user, hospitalName, temporaryPassword, tenantId) => {
  try {
    const result = await resend.emails.send({
      from: `HMS <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Welcome to ${hospitalName}`,
      html: `
        <h2>Welcome to ${hospitalName}</h2>
        <p>Hello ${user.firstName} ${user.lastName},</p>
        <p>Your account has been created successfully.</p>
        <p><strong>Department:</strong> ${user.department}</p>
        <p><strong>Roles:</strong> ${Array.isArray(user.roles) ? user.roles.join(', ') : user.roles}</p>
        <p><strong>Tenant ID:</strong> ${tenantId}</p>
        <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
        <p>Please login and change your password after first login.</p>
      `
    });

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error
    };
  }
};
module.exports = { resend  , sendWelcomeEmail };