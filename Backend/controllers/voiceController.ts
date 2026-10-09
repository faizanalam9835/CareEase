import crypto from 'crypto';
import type { Request, RequestHandler } from 'express';
import Appointment from '../models/Appointment';
import Patient from '../models/Patient';
import User from '../models/User';
import config from '../config/env';
import { ApiError, asyncHandler } from '../utils/apiError';
import { logActivity } from '../utils/activityLog';
import { z } from '../middleware/validate';
import { BLOOD_GROUPS, DEPARTMENTS, GENDERS } from '../config/constants';
import { doctorSlots, sendAppointmentEmails } from './appointmentController';

/*
 * Endpoints for the Sarvam voice receptionist. It authenticates with a shared
 * secret (not a staff JWT), is pinned to one hospital, and can only list
 * doctors, read free slots and book. Responses are kept tiny on purpose: every
 * byte returned becomes LLM tokens on the voice platform's bill.
 */

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest();

/** Resolves the hospital from `x-voice-key` (constant-time) and pins the request to it. */
export const voiceAuth: RequestHandler = (req, _res, next) => {
  const sent = sha256(String(req.headers['x-voice-key'] || ''));
  // Compare against every key, no early exit, so timing does not reveal which tenant matched.
  let tenantId = '';
  for (const entry of config.voiceKeys) {
    if (crypto.timingSafeEqual(sent, sha256(entry.key))) tenantId = entry.tenantId;
  }
  if (!tenantId) return next(ApiError.unauthorized('Invalid voice key'));
  req.tenantId = tenantId;
  next();
};

const VOICE_ACTOR = { tenantId: '', firstName: 'Voice', lastName: 'Receptionist', roles: ['RECEPTIONIST'] };

// Callers say dates, the bot sends YYYY-MM-DD; a bare string avoids timezone surprises.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
// ponytail: hospitals are in India, so "today" and "now" are IST; make it per-tenant if one opens abroad.
const nowIST = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }); // "2026-10-08 23:40:12"
const today = () => nowIST().slice(0, 10);
/** A slot is bookable only if it is free and, for today, still ahead of the clock. */
const isUpcoming = (date: string, time: string) => date > today() || time > nowIST().slice(11, 16);

/** Voice platforms may send GET params as a JSON body instead of the query string; accept either. */
const param = (req: Request, key: string): string | undefined => {
  const value = req.query[key] ?? req.body?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const findDoctor = async (tenantId: string, doctorId: string) => {
  const doctor = await User.findOne({ _id: doctorId, tenantId, roles: 'DOCTOR', status: 'ACTIVE' }).catch(() => null);
  if (doctor) return doctor;

  // LLMs invent ids. Hand back the real list inside the error so the bot can recover in the same turn.
  const real = await User.find({ tenantId, roles: 'DOCTOR', status: 'ACTIVE' }).select('firstName lastName department');
  const list = real.map((d) => `Dr. ${d.firstName} ${d.lastName} (${d.department}) id=${d._id}`).join('; ');
  throw ApiError.notFound(`Unknown doctorId. Use only these real doctors: ${list}`);
};

/** GET /api/voice/doctors?department= */
export const voiceDoctors = asyncHandler(async (req, res) => {
  // LLMs send "cardiology" or "General Medicine"; match the stored name loosely.
  const asked = param(req, 'department')?.toLowerCase();
  const department = asked && DEPARTMENTS.find((d) => asked.startsWith(d.toLowerCase()));
  if (asked && !department) return res.json({ doctors: `No ${asked} department in this hospital` });
  const doctors = await User.find({
    tenantId: req.tenantId,
    roles: 'DOCTOR',
    status: 'ACTIVE',
    ...(department ? { department } : {})
  }).select('firstName lastName department consultationFee');

  // One readable string, not an array: Sarvam's "@field" template only substitutes
  // plain values, so a list arrives at the agent as the literal text "@doctors".
  res.json({
    doctors: doctors.length
      ? doctors.map((d) => `Dr. ${d.firstName} ${d.lastName} (department ${d.department}, fee Rs ${d.consultationFee}, id ${d._id})`).join('; ')
      : `No doctor available${department ? ` in ${department}` : ''}`
  });
});

/** GET /api/voice/availability?doctorId=&date=YYYY-MM-DD */
export const voiceAvailability = asyncHandler(async (req, res) => {
  const doctorId = param(req, 'doctorId');
  const date = param(req, 'date');
  if (!doctorId || !date || !isoDate.safeParse(date).success) {
    throw ApiError.badRequest('doctorId and date (YYYY-MM-DD) are required');
  }
  if (date < today()) throw ApiError.badRequest('Date is in the past');

  const doctor = await findDoctor(req.tenantId, doctorId);
  const slots = await doctorSlots(req.tenantId, doctor, date);
  const free = slots.filter((s) => s.available && isUpcoming(date, s.time)).map((s) => s.time);
  res.json({ date, freeTimes: free.length ? free.join(', ') : 'None, this day is full' });
});

// Voice tools send unused optional fields as "" and numbers as numbers; treat "" as not given.
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

// Spoken blood groups arrive as "B positive", "o-", "AB +ve"...; anything unclear is stored as Unknown.
const bloodGroup = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const g = String(v).toUpperCase().replace(/\s+/g, '').replace(/POSITIVE|POS|\+VE/g, '+').replace(/NEGATIVE|NEG|-VE/g, '-');
  return (BLOOD_GROUPS as readonly string[]).includes(g) ? g : 'Unknown';
}, z.enum(BLOOD_GROUPS).optional());

// "penicillin, dust" -> ["penicillin", "dust"]; "none" / "nahi" -> [].
const allergyList = z.preprocess(
  (v) =>
    typeof v === 'string'
      ? v.split(/,|\band\b|\baur\b/i).map((a) => a.trim()).filter((a) => a && !/^(none|no|nahi|nahin|koi nahi|nil|na)$/i.test(a))
      : v,
  z.array(z.string().max(60)).max(20).optional()
);

export const voiceBookSchema = z
  .object({
    phone: z.coerce.string().trim().min(10).max(20),
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    dateOfBirth: optional(isoDate),
    age: optional(z.coerce.number().int().min(0).max(120)),
    gender: z.enum(GENDERS),
    doctorId: z.string().trim().min(1),
    date: isoDate,
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:MM'),
    reason: z.string().trim().min(2).max(300),
    email: optional(z.string().trim().toLowerCase().email().max(100)),
    bloodGroup,
    allergies: allergyList,
    city: optional(z.string().trim().max(80))
  })
  .refine((b) => b.dateOfBirth || b.age !== undefined, { message: 'dateOfBirth or age is required', path: ['age'] });

/** POST /api/voice/book */
export const voiceBook = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof voiceBookSchema>;
  const tenantId = req.tenantId;

  if (body.date < today()) throw ApiError.badRequest('Date is in the past');

  const doctor = await findDoctor(tenantId, body.doctorId);
  const slots = await doctorSlots(tenantId, doctor, body.date);
  if (!slots.some((s) => s.time === body.time && s.available && isUpcoming(body.date, s.time))) {
    throw ApiError.conflict('That time is not free. Ask the caller to pick another slot.');
  }

  // Same phone + same first name = returning patient; otherwise a new record.
  const phone = body.phone.replace(/\D/g, '').slice(-10);
  const existing = await Patient.find({ tenantId, phone });
  let patient = existing.find((p) => p.firstName.toLowerCase() === body.firstName.toLowerCase());
  if (!patient) {
    // ponytail: age-only callers get 1 Jan of their birth year; staff can correct it at the desk.
    const dateOfBirth = body.dateOfBirth ?? `${new Date().getFullYear() - (body.age as number)}-01-01`;
    patient = await Patient.create({
      firstName: body.firstName,
      lastName: body.lastName,
      dateOfBirth: new Date(dateOfBirth),
      gender: body.gender,
      phone,
      bloodGroup: body.bloodGroup,
      allergies: body.allergies,
      address: body.city ? { city: body.city } : undefined,
      department: (DEPARTMENTS as readonly string[]).includes(doctor.department) ? doctor.department : 'General',
      notes: 'Registered by voice receptionist',
      tenantId
    });
  }

  // Save the spoken email only on a record that has none: a spoofed caller ID
  // must not be able to redirect an existing patient's mail.
  // Same rule for the other details: only fill what the record does not have yet.
  let changed = false;
  if (body.email && !patient.email) [patient.email, changed] = [body.email, true];
  if (body.bloodGroup && body.bloodGroup !== 'Unknown' && (!patient.bloodGroup || patient.bloodGroup === 'Unknown')) {
    [patient.bloodGroup, changed] = [body.bloodGroup, true];
  }
  if (body.allergies?.length && !patient.allergies?.length) [patient.allergies, changed] = [body.allergies, true];
  if (body.city && !patient.address?.city) {
    patient.set('address.city', body.city);
    changed = true;
  }
  if (changed) await patient.save();

  const appointment = await Appointment.create({
    patientId: patient._id,
    doctorId: doctor._id,
    appointmentDate: new Date(body.date),
    appointmentTime: body.time,
    department: doctor.department,
    reason: body.reason,
    amount: doctor.consultationFee ?? 0,
    status: 'Scheduled',
    source: 'Voice',
    tenantId
  });

  logActivity({
    user: { ...VOICE_ACTOR, tenantId },
    action: 'APPOINTMENT_CREATED',
    entityType: 'APPOINTMENT',
    entityId: appointment._id,
    description: `Voice booking ${appointment.appointmentId} for ${patient.firstName} ${patient.lastName} with Dr. ${doctor.lastName}`
  });

  sendAppointmentEmails(appointment, patient, doctor);

  res.status(201).json({
    appointmentId: appointment.appointmentId,
    // Masked, so the bot can say where it went without reading the address aloud.
    emailSentTo: patient.email ? patient.email.replace(/^(.{2})[^@]*/, '$1***') : null,
    doctor: `Dr. ${doctor.firstName} ${doctor.lastName}`,
    date: body.date,
    time: body.time,
    fee: appointment.amount
  });
});
