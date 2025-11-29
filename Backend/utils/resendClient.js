const { Resend } = require('resend');

// Resend client initialize karo
const resend = new Resend(process.env.RESEND_API_KEY);

// Test email function
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

module.exports = { resend, testEmail };