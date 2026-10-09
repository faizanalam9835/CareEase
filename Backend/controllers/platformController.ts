import crypto from 'crypto';
import { z } from 'zod';

import Hospital from '../models/Hospital';
import User from '../models/User';
import Patient from '../models/Patient';
import Appointment from '../models/Appointment';
import config from '../config/env';
import { ApiError, asyncHandler } from '../utils/apiError';
import { sendMail } from '../utils/mailer';
import * as templates from '../utils/emailTemplates';
import { generateTemporaryPassword } from '../utils/generateToken';
import { logActivity } from '../utils/activityLog';

/** Tenant ids look like TA1B2C3D - short and readable. */
const buildTenantId = () => `T${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

export const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(300),
  city: optional(z.string().trim().max(80)),
  state: optional(z.string().trim().max(80)),
  contactNumber: z.coerce.string().trim().min(7).max(20),
  licenseNumber: z.string().trim().min(3).max(60),
  website: optional(z.string().trim().max(200)),
  bedCapacity: optional(z.coerce.number().int().min(0).max(100000)),
  adminFirstName: optional(z.string().trim().max(60)),
  adminLastName: optional(z.string().trim().max(60)),
  adminEmail: z.string().trim().toLowerCase().email().max(100)
});

export const tenantStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });

/** Per-tenant count of a collection, in one query instead of one per hospital. */
const countByTenant = async (model: typeof User | typeof Patient | typeof Appointment) => {
  const rows: { _id: string; n: number }[] = await (model as typeof User).aggregate([
    { $group: { _id: '$tenantId', n: { $sum: 1 } } }
  ]);
  return new Map(rows.map((row) => [row._id, row.n]));
};

/** GET /api/platform/tenants - every hospital on the platform with headline counts. */
export const listTenants = asyncHandler(async (_req, res) => {
  const [hospitals, staff, patients, appointments] = await Promise.all([
    Hospital.find().sort({ createdAt: -1 }).lean(),
    countByTenant(User),
    countByTenant(Patient),
    countByTenant(Appointment)
  ]);

  res.json({
    success: true,
    tenants: hospitals.map((h) => ({
      ...h,
      staffCount: staff.get(h.tenantId) || 0,
      patientCount: patients.get(h.tenantId) || 0,
      appointmentCount: appointments.get(h.tenantId) || 0
    }))
  });
});

/**
 * POST /api/platform/tenants - onboard a hospital.
 *
 * Creates the workspace already active plus its first administrator with a
 * temporary password, e-mails the administrator, and returns the password so
 * the platform team can hand it over if the mail does not arrive.
 */
export const createTenant = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createTenantSchema>;

  const existing = await Hospital.findOne({
    $or: [{ licenseNumber: body.licenseNumber }, { adminEmail: body.adminEmail }]
  });
  if (existing) {
    throw ApiError.conflict(
      existing.adminEmail === body.adminEmail
        ? 'A hospital already uses this administrator e-mail'
        : 'A hospital is already registered with this licence number'
    );
  }

  let tenantId = buildTenantId();
  // eslint-disable-next-line no-await-in-loop
  while (await Hospital.exists({ tenantId })) tenantId = buildTenantId();

  const hospital = await Hospital.create({
    name: body.name,
    address: body.address,
    city: body.city,
    state: body.state,
    contactNumber: body.contactNumber,
    adminEmail: body.adminEmail,
    licenseNumber: body.licenseNumber,
    website: body.website,
    bedCapacity: body.bedCapacity ?? 50,
    tenantId,
    status: 'ACTIVE',
    verifiedAt: new Date()
  });

  const temporaryPassword = generateTemporaryPassword();
  let admin;
  try {
    admin = await User.create({
      firstName: body.adminFirstName || 'Hospital',
      lastName: body.adminLastName || 'Administrator',
      email: body.adminEmail,
      professionalEmail: body.adminEmail,
      phone: body.contactNumber,
      password: temporaryPassword,
      department: 'Administration',
      designation: 'Administrator',
      roles: ['HOSPITAL_ADMIN'],
      tenantId,
      status: 'ACTIVE',
      mustChangePassword: true
    });
  } catch (error) {
    // No half-created tenant: a hospital without an admin cannot be reached.
    await Hospital.deleteOne({ _id: hospital._id });
    throw error;
  }

  // Awaited, not fire-and-forget: a serverless function may stop once it has responded.
  const mail = await sendMail({
    to: body.adminEmail,
    ...templates.hospitalActivated({
      hospitalName: hospital.name,
      tenantId,
      adminEmail: body.adminEmail,
      temporaryPassword
    })
  });

  logActivity({
    user: req.user,
    action: 'TENANT_CREATED',
    entityType: 'HOSPITAL',
    entityId: hospital._id,
    description: `Onboarded ${hospital.name} (${tenantId})`
  });

  res.status(201).json({
    success: true,
    message: `${hospital.name} is live`,
    tenant: hospital,
    admin: { id: admin._id, email: admin.email, temporaryPassword },
    emailSent: mail.delivered === true
  });
});

/** PATCH /api/platform/tenants/:tenantId/status - suspend or re-activate a hospital. */
export const setTenantStatus = asyncHandler(async (req, res) => {
  const { status } = req.body as z.infer<typeof tenantStatusSchema>;
  const hospital = await Hospital.findOneAndUpdate(
    { tenantId: String(req.params.tenantId).toUpperCase() },
    { status },
    { new: true }
  );
  if (!hospital) throw ApiError.notFound('Hospital not found');

  logActivity({
    user: req.user,
    action: status === 'SUSPENDED' ? 'TENANT_SUSPENDED' : 'TENANT_ACTIVATED',
    entityType: 'HOSPITAL',
    entityId: hospital._id,
    description: `${hospital.name} set to ${status}`
  });

  res.json({ success: true, message: `${hospital.name} is now ${status.toLowerCase()}`, tenant: hospital });
});

export const onboardingRequestSchema = z.object({
  hospitalName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(100),
  phone: z.coerce.string().trim().min(7).max(20),
  city: optional(z.string().trim().max(80)),
  beds: optional(z.coerce.number().int().min(0).max(100000)),
  message: optional(z.string().trim().max(1000)),
  // Honeypot: hidden on the form, so only bots fill it.
  company: optional(z.string().max(200))
});

// ponytail: per-instance memory, so each serverless instance has its own count; move to the DB if spam gets through.
const recentRequests = new Map<string, number[]>();
const HOUR = 60 * 60 * 1000;

/** POST /api/contact - public: a hospital asks to be onboarded. E-mails the CareEase team. */
export const requestOnboarding = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof onboardingRequestSchema>;
  if (body.company) return res.json({ success: true, message: 'Thanks, we will be in touch.' });

  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  const now = Date.now();
  const hits = (recentRequests.get(ip) || []).filter((t) => now - t < HOUR);
  if (hits.length >= 5) throw new ApiError(429, 'Too many requests. Please try again in an hour.');
  recentRequests.set(ip, [...hits, now]);

  if (!config.contactEmail && config.email.enabled) throw new ApiError(503, 'Onboarding requests are not set up yet.');
  const mail = await sendMail({ to: config.contactEmail || 'console', ...templates.onboardingRequest(body) });
  if (!mail.success) {
    throw new ApiError(502, 'Your request could not be sent right now. Please try again in a few minutes.');
  }
  res.json({ success: true, message: 'Thanks! The CareEase team will contact you within one working day.' });
});

export const mailCheckSchema = z.object({ to: optional(z.string().trim().toLowerCase().email().max(100)) });

/** POST /api/platform/mail-check - sends a test e-mail so the platform team can confirm delivery. */
export const mailCheck = asyncHandler(async (req, res) => {
  const to = (req.body as z.infer<typeof mailCheckSchema>).to || config.contactEmail;
  if (!to) throw ApiError.badRequest('Give an address to send the test to');
  const mail = await sendMail({ to, ...templates.mailCheck() });
  res.status(mail.success ? 200 : 502).json({
    success: mail.success,
    to,
    delivered: mail.delivered,
    message: mail.delivered
      ? `Test e-mail sent to ${to}`
      : mail.mode === 'console'
        ? 'E-mail is not configured (EMAIL_USER / EMAIL_PASS), so nothing was sent'
        : `Sending failed: ${mail.error}`
  });
});
