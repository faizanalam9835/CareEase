const { Resend } = require('resend');

// Resend client initialize karo
const resend = new Resend(process.env.RESEND_API_KEY);

// Test email function
const { getWelcomeEmailTemplate } = require('../utils/emailTemplates1');

const testEmail = async () => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'HMS <onboarding@resend.dev>',
      to: ['test@example.com'],
      subject: 'Test Email from HMS',
      html: '<strong>HMS Server is working!</strong>'
    });

    if (error) {
      console.error('❌ Resend Error:', error);
      return null;
    }

    console.log('✅ Email sent successfully:', data);
    return data;
  } catch (err) {
    console.error('❌ Email sending failed:', err);
    return null;
  }
};


const sendWelcomeEmail = async (user, hospitalName, temporaryPassword, tenantId) => {
  try {
    const isDoctor = user.roles.includes('DOCTOR');
    
    const emailSubject = isDoctor 
      ? `🎉 Welcome Dr. ${user.lastName} to ${hospitalName} - Your Account Details`
      : `👤 Welcome to ${hospitalName} - Your Professional Account Details`;

    const { data, error } = await resend.emails.send({
      from: `"${hospitalName} HR" HMS <onboarding@resend.dev>`,
      to: user.email,
      subject: emailSubject,
      html: getWelcomeEmailTemplate(user, hospitalName, temporaryPassword, tenantId, isDoctor),
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error };
    }

    console.log(`Welcome email sent successfully to: ${user.email}`);
    return { success: true, data };

  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
};

module.exports = { resend, testEmail , sendWelcomeEmail};