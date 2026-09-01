const config = require('../config/env');

const shell = (title, bodyHtml) => `
<div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:24px 28px">
      <h1 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:-0.2px">CareEase HMS</h1>
      <p style="margin:4px 0 0;color:#cffafe;font-size:13px">${title}</p>
    </div>
    <div style="padding:28px;color:#0f172a;font-size:14px;line-height:1.7">
      ${bodyHtml}
    </div>
    <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px">
      This is an automated message from CareEase Hospital Management System.
    </div>
  </div>
</div>`;

const row = (label, value) =>
  `<tr><td style="padding:6px 12px 6px 0;color:#64748b">${label}</td><td style="padding:6px 0;font-weight:600">${value}</td></tr>`;

const table = (rows) =>
  `<table style="width:100%;border-collapse:collapse;margin:16px 0">${rows.join('')}</table>`;

const button = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:#0891b2;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">${label}</a>`;

const hospitalVerification = ({ hospitalName, tenantId, verificationLink, token }) => ({
  subject: 'Verify your hospital registration - CareEase HMS',
  html: shell(
    'Hospital registration',
    `<p>Welcome, <strong>${hospitalName}</strong>.</p>
     <p>Your workspace is ready. Confirm your e-mail address to activate it and create your administrator account.</p>
     <p style="margin:24px 0">${button(verificationLink, 'Verify and activate')}</p>
     ${table([row('Hospital ID', tenantId), row('Verification token', token)])}
     <p style="color:#64748b">Keep your Hospital ID safe - every member of your team needs it to sign in. This link expires in 24 hours.</p>`
  )
});

const hospitalActivated = ({ hospitalName, tenantId, adminEmail, temporaryPassword }) => ({
  subject: 'Your CareEase workspace is active',
  html: shell(
    'Workspace activated',
    `<p><strong>${hospitalName}</strong> is now active on CareEase.</p>
     <p>Sign in with the administrator account below and change the password right away.</p>
     ${table([
       row('Hospital ID', tenantId),
       row('E-mail', adminEmail),
       row('Temporary password', temporaryPassword)
     ])}
     <p style="margin:24px 0">${button(`${config.clientUrl}/login`, 'Go to sign in')}</p>`
  )
});

const staffWelcome = ({
  firstName,
  lastName,
  email,
  department,
  roles,
  hospitalName,
  tenantId,
  temporaryPassword
}) => ({
  subject: `Your ${hospitalName} account is ready`,
  html: shell(
    'Staff account created',
    `<p>Hello ${firstName} ${lastName},</p>
     <p>An account has been created for you at <strong>${hospitalName}</strong>.</p>
     ${table([
       row('Hospital ID', tenantId),
       row('E-mail', email),
       row('Temporary password', temporaryPassword),
       row('Department', department),
       row('Role', Array.isArray(roles) ? roles.join(', ') : roles)
     ])}
     <p style="margin:24px 0">${button(`${config.clientUrl}/login`, 'Sign in')}</p>
     <p style="color:#64748b">You will be asked to choose a new password on first sign in.</p>`
  )
});

const appointmentForPatient = ({ appointment, patient, doctor }) => ({
  subject: `Appointment confirmed - ${new Date(appointment.appointmentDate).toDateString()}`,
  html: shell(
    'Appointment confirmation',
    `<p>Hello ${patient.firstName},</p>
     <p>Your appointment has been booked.</p>
     ${table([
       row('Reference', appointment.appointmentId),
       row('Doctor', `Dr. ${doctor.firstName} ${doctor.lastName}`),
       row('Department', appointment.department),
       row('Date', new Date(appointment.appointmentDate).toDateString()),
       row('Time', appointment.appointmentTime),
       row('Reason', appointment.reason)
     ])}
     <p style="color:#64748b">Please arrive 10 minutes early. To reschedule, contact the reception desk.</p>`
  )
});

const appointmentForDoctor = ({ appointment, patient, doctor }) => ({
  subject: `New appointment - ${patient.firstName} ${patient.lastName}`,
  html: shell(
    'New appointment',
    `<p>Dr. ${doctor.firstName},</p>
     <p>A new appointment has been added to your schedule.</p>
     ${table([
       row('Reference', appointment.appointmentId),
       row('Patient', `${patient.firstName} ${patient.lastName} (${patient.patientId})`),
       row('Date', new Date(appointment.appointmentDate).toDateString()),
       row('Time', appointment.appointmentTime),
       row('Reason', appointment.reason)
     ])}`
  )
});

const passwordReset = ({ firstName, temporaryPassword, tenantId }) => ({
  subject: 'Your CareEase password has been reset',
  html: shell(
    'Password reset',
    `<p>Hello ${firstName},</p>
     <p>An administrator reset your password. Use the temporary password below and change it after signing in.</p>
     ${table([row('Hospital ID', tenantId), row('Temporary password', temporaryPassword)])}
     <p style="margin:24px 0">${button(`${config.clientUrl}/login`, 'Sign in')}</p>`
  )
});

module.exports = {
  hospitalVerification,
  hospitalActivated,
  staffWelcome,
  appointmentForPatient,
  appointmentForDoctor,
  passwordReset
};
