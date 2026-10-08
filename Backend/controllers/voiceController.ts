import crypto from 'crypto';
import type { RequestHandler } from 'express';
import Appointment from '../models/Appointment';
import Patient from '../models/Patient';
import User from '../models/User';
import config from '../config/env';
import { ApiError, asyncHandler } from '../utils/apiError';
import { logActivity } from '../utils/activityLog';
import { z } from '../middleware/validate';
import { DEPARTMENTS, GENDERS } from '../config/constants';
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
const today = () => new Date().toISOString().slice(0, 10);

const findDoctor = async (tenantId: string, doctorId: string) => {
  const doctor = await User.findOne({ _id: doctorId, tenantId, roles: 'DOCTOR', status: 'ACTIVE' }).catch(() => null);
  if (!doctor) throw ApiError.notFound('Doctor not found');
  return doctor;
};

/** GET /api/voice/doctors?department= */
export const voiceDoctors = asyncHandler(async (req, res) => {
  const department = typeof req.query.department === 'string' ? req.query.department : undefined;
  const doctors = await User.find({
    tenantId: req.tenantId,
    roles: 'DOCTOR',
    status: 'ACTIVE',
    ...(department ? { department } : {})
  }).select('firstName lastName department consultationFee');

  res.json({
    doctors: doctors.map((d) => ({
      id: d._id,
      name: `Dr. ${d.firstName} ${d.lastName}`,
      department: d.department,
      fee: d.consultationFee
    }))
  });
});

/** GET /api/voice/availability?doctorId=&date=YYYY-MM-DD */
export const voiceAvailability = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query as Record<string, string | undefined>;
  if (!doctorId || !date || !isoDate.safeParse(date).success) {
    throw ApiError.badRequest('doctorId and date (YYYY-MM-DD) are required');
  }
  if (date < today()) throw ApiError.badRequest('Date is in the past');

  const doctor = await findDoctor(req.tenantId, doctorId);
  const slots = await doctorSlots(req.tenantId, doctor, date);
  res.json({ date, freeTimes: slots.filter((s) => s.available).map((s) => s.time) });
});

export const voiceBookSchema = z
  .object({
    phone: z.string().trim().min(10).max(20),
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    dateOfBirth: isoDate.optional(),
    age: z.coerce.number().int().min(0).max(120).optional(),
    gender: z.enum(GENDERS),
    doctorId: z.string().trim().min(1),
    date: isoDate,
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:MM'),
    reason: z.string().trim().min(2).max(300),
    email: z.string().trim().toLowerCase().email().max(100).optional()
  })
  .refine((b) => b.dateOfBirth || b.age !== undefined, { message: 'dateOfBirth or age is required', path: ['age'] });

/** POST /api/voice/book */
export const voiceBook = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof voiceBookSchema>;
  const tenantId = req.tenantId;

  if (body.date < today()) throw ApiError.badRequest('Date is in the past');

  const doctor = await findDoctor(tenantId, body.doctorId);
  const slots = await doctorSlots(tenantId, doctor, body.date);
  if (!slots.some((s) => s.time === body.time && s.available)) {
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
      department: (DEPARTMENTS as readonly string[]).includes(doctor.department) ? doctor.department : 'General',
      notes: 'Registered by voice receptionist',
      tenantId
    });
  }

  // Save the spoken email only on a record that has none: a spoofed caller ID
  // must not be able to redirect an existing patient's mail.
  if (body.email && !patient.email) {
    patient.email = body.email;
    await patient.save();
  }

  const appointment = await Appointment.create({
    patientId: patient._id,
    doctorId: doctor._id,
    appointmentDate: new Date(body.date),
    appointmentTime: body.time,
    department: doctor.department,
    reason: body.reason,
    amount: doctor.consultationFee ?? 0,
    status: 'Scheduled',
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
