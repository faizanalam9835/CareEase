import config from '../config/env';

export interface MailContent {
  subject: string;
  html: string;
}

// Only the fields the templates actually read, so both documents and plain
// objects can be passed in.
interface AppointmentMailData {
  appointment: {
    appointmentId?: string | null;
    appointmentDate: Date | string | number;
    appointmentTime: string;
    department?: string | null;
    reason: string;
  };
  patient: { firstName: string; lastName: string; patientId?: string | null };
  doctor: { firstName: string; lastName: string };
}

type Printable = string | number | null | undefined;

const shell = (title: string, bodyHtml: string): string => `
<div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#1d66ed;padding:24px 28px">
      <h1 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:-0.2px">CareEase HMS</h1>
      <p style="margin:4px 0 0;color:#dee9fc;font-size:13px">${title}</p>
    </div>
    <div style="padding:28px;color:#0f172a;font-size:14px;line-height:1.7">
      ${bodyHtml}
    </div>
    <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px">
      This is an automated message from CareEase Hospital Management System.
    </div>
  </div>
</div>`;

/** Names, reasons and other typed-in values go into HTML, so they are escaped. */
const esc = (value: Printable): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const row = (label: string, value: Printable): string =>
  `<tr><td style="padding:6px 12px 6px 0;color:#64748b">${label}</td><td style="padding:6px 0;font-weight:600">${esc(value)}</td></tr>`;

const table = (rows: string[]): string =>
  `<table style="width:100%;border-collapse:collapse;margin:16px 0">${rows.join('')}</table>`;

const button = (href: string, label: string): string =>
  `<a href="${href}" style="display:inline-block;background:#1d66ed;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">${label}</a>`;

const hospitalActivated = ({
  hospitalName,
  tenantId,
  adminEmail,
  temporaryPassword
}: {
  hospitalName: string;
  tenantId: string;
  adminEmail: string;
  temporaryPassword: string;
}): MailContent => ({
  subject: 'Your CareEase workspace is active',
  html: shell(
    'Workspace activated',
    `<p><strong>${esc(hospitalName)}</strong> is now active on CareEase.</p>
     <p>Sign in with just your e-mail and the temporary password below; you will be asked to choose your own password.</p>
     ${table([
       row('Tenant ID (for support)', tenantId),
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
  temporaryPassword
}: {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  roles: string[] | string;
  hospitalName: string;
  temporaryPassword: string;
}): MailContent => ({
  subject: `Your ${hospitalName} account is ready`,
  html: shell(
    'Staff account created',
    `<p>Hello ${esc(firstName)} ${esc(lastName)},</p>
     <p>An account has been created for you at <strong>${esc(hospitalName)}</strong>. Sign in with your e-mail and the temporary password below.</p>
     ${table([
       row('Hospital', hospitalName),
       row('E-mail', email),
       row('Temporary password', temporaryPassword),
       row('Department', department),
       row('Role', Array.isArray(roles) ? roles.join(', ') : roles)
     ])}
     <p style="margin:24px 0">${button(`${config.clientUrl}/login`, 'Sign in')}</p>
     <p style="color:#64748b">You will be asked to choose a new password on first sign in.</p>`
  )
});

const appointmentForPatient = ({ appointment, patient, doctor }: AppointmentMailData): MailContent => ({
  subject: `Appointment confirmed - ${new Date(appointment.appointmentDate).toDateString()}`,
  html: shell(
    'Appointment confirmation',
    `<p>Hello ${esc(patient.firstName)},</p>
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

const appointmentForDoctor = ({ appointment, patient, doctor }: AppointmentMailData): MailContent => ({
  subject: `New appointment - ${patient.firstName} ${patient.lastName}`,
  html: shell(
    'New appointment',
    `<p>Dr. ${esc(doctor.firstName)},</p>
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

const passwordReset = ({
  firstName,
  email,
  temporaryPassword
}: {
  firstName: string;
  email: string;
  temporaryPassword: string;
}): MailContent => ({
  subject: 'Your CareEase password has been reset',
  html: shell(
    'Password reset',
    `<p>Hello ${esc(firstName)},</p>
     <p>An administrator reset your password. Use the temporary password below and change it after signing in.</p>
     ${table([row('E-mail', email), row('Temporary password', temporaryPassword)])}
     <p style="margin:24px 0">${button(`${config.clientUrl}/login`, 'Sign in')}</p>`
  )
});

/** A hospital asking to be onboarded, from the landing page. Goes to the CareEase team. */
const onboardingRequest = (lead: {
  hospitalName: string;
  contactName: string;
  email: string;
  phone: string;
  city?: string;
  beds?: number;
  message?: string;
}): MailContent => ({
  subject: `Onboarding request: ${lead.hospitalName}`,
  html: shell(
    'New onboarding request',
    `<p>A hospital asked to join CareEase from the website.</p>
     ${table([
       row('Hospital', lead.hospitalName),
       row('Contact', lead.contactName),
       row('E-mail', lead.email),
       row('Phone', lead.phone),
       row('City', lead.city || '-'),
       row('Beds', lead.beds ?? '-'),
       row('Message', lead.message || '-')
     ])}
     <p>Onboard them from the Platform page once you have spoken to them.</p>
     <p style="margin:24px 0">${button(`${config.clientUrl}/app/platform`, 'Open the platform admin')}</p>`
  )
});

/** Sent from the platform admin to prove the mail account works. */
const mailCheck = (): MailContent => ({
  subject: 'CareEase e-mail check',
  html: shell('E-mail check', `<p>If you can read this, CareEase can send e-mail. Sent ${new Date().toUTCString()}.</p>`)
});

export {
  onboardingRequest,
  mailCheck,
  hospitalActivated,
  staffWelcome,
  appointmentForPatient,
  appointmentForDoctor,
  passwordReset
};
