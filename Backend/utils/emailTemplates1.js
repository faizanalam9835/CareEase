// src/templates/emailTemplates.js
const getWelcomeEmailTemplate = (user, hospitalName, temporaryPassword, tenantId, isDoctor = false) => {
    const roleDisplay = user.roles?.[0]?.replace('_', ' ') || 'Team Member';
    const isDoctorRole = user.roles?.includes('DOCTOR');
    
    return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        line-height: 1.6; 
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f6f9fc;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, #0891b2, #0e7490);
        padding: 30px;
        text-align: center;
        color: white;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
      }
      .content {
        padding: 40px;
      }
      .welcome-section {
        text-align: center;
        margin-bottom: 30px;
      }
      .welcome-icon {
        font-size: 48px;
        margin-bottom: 20px;
      }
      .congratulations {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 20px;
        border-radius: 8px;
        margin: 25px 0;
        text-align: center;
      }
      .credentials {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 25px;
        margin: 25px 0;
      }
      .credential-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      .credential-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      .label {
        font-weight: 600;
        color: #64748b;
      }
      .value {
        font-weight: 600;
        color: #1e293b;
      }
      .password-warning {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 6px;
        padding: 15px;
        margin: 20px 0;
        text-align: center;
        color: #92400e;
      }
      .cta-button {
        display: inline-block;
        background: #0891b2;
        color: white;
        padding: 14px 32px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        margin: 20px 0;
      }
      .footer {
        text-align: center;
        padding: 25px;
        background: #f8fafc;
        color: #64748b;
        font-size: 14px;
      }
      .hospital-name {
        color: #0891b2;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1>🏥 ${hospitalName}</h1>
        <p>Hospital Management System</p>
      </div>
  
      <!-- Content -->
      <div class="content">
        <!-- Welcome Section -->
        <div class="welcome-section">
          <div class="welcome-icon">
            ${isDoctorRole ? '👨‍⚕️' : '👤'}
          </div>
          <h2>Welcome to ${hospitalName}!</h2>
          <p>Dear <strong>${user.firstName} ${user.lastName}</strong>,</p>
          <p>Your professional account has been successfully created as <strong>${roleDisplay}</strong>.</p>
        </div>
  
        <!-- Congratulations for Doctors -->
        ${isDoctorRole ? `
        <div class="congratulations">
          <h3>🎉 Congratulations Doctor!</h3>
          <p>We're excited to have you join our medical team at ${hospitalName}. Your expertise will help us provide exceptional healthcare services.</p>
        </div>
        ` : ''}
  
        <!-- Login Credentials -->
        <div class="credentials">
          <h3 style="text-align: center; margin-bottom: 20px; color: #1e293b;">Your Login Credentials</h3>
          
          <div class="credential-item">
            <span class="label">Professional Email:</span>
            <span class="value">${user.email}</span>
          </div>
          
          <div class="credential-item">
            <span class="label">Temporary Password:</span>
            <span class="value">${temporaryPassword}</span>
          </div>
          
          <div class="credential-item">
            <span class="label">Hospital ID:</span>
            <span class="value">${tenantId}</span>
          </div>
          
          <div class="credential-item">
            <span class="label">Your Role:</span>
            <span class="value">${roleDisplay}</span>
          </div>
          
          <div class="credential-item">
            <span class="label">Department:</span>
            <span class="value">${user.department}</span>
          </div>
        </div>
  
        <!-- Password Warning -->
        <div class="password-warning">
          <strong>🔒 Security Notice:</strong> Please change your temporary password immediately after first login for security reasons.
        </div>
  
        <!-- Call to Action -->
        <div style="text-align: center;">
          <p><strong>Ready to get started?</strong></p>
          <a href="https://your-hospital-domain.com/login" class="cta-button">
            Access Your Account
          </a>
          <p style="color: #64748b; margin-top: 10px;">
            Login URL: https://your-hospital-domain.com/login
          </p>
        </div>
  
        <!-- Next Steps -->
        <div style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 8px;">
          <h4 style="color: #0369a1; margin-top: 0;">Next Steps:</h4>
          <ul style="color: #475569;">
            <li>Login using your credentials above</li>
            <li>Complete your profile setup</li>
            <li>Change your temporary password</li>
            <li>Familiarize yourself with the system</li>
            ${isDoctorRole ? '<li>Review assigned patients and schedules</li>' : ''}
          </ul>
        </div>
      </div>
  
      <!-- Footer -->
      <div class="footer">
        <p><strong>${hospitalName} - Healthcare Management Team</strong></p>
        <p>For technical support, contact: IT Department | support@${hospitalName.toLowerCase().replace(/\s+/g, '')}.com</p>
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  </body>
  </html>
    `;
  };
  
  module.exports = {
    getWelcomeEmailTemplate
  };