import Appointment from '../models/Appointment';
import Patient from '../models/Patient';
import User from '../models/User';
import { ApiError, asyncHandler } from '../utils/apiError';
import { sendMailAsync } from '../utils/mailer';
import * as templates from '../utils/emailTemplates';
import { logActivity } from '../utils/activityLog';
import { getPagination, buildMeta } from '../utils/pagination';
import { isCrossDepartment } from '../middleware/abac';
import { APPOINTMENT_STATUSES } from '../config/constants';
import type { Types } from 'mongoose';
import type { AppointmentDoc } from '../models/Appointment';
import type { PatientDoc } from '../models/Patient';
import type { UserDoc } from '../models/User';

// Query values these handlers read are plain `?key=value` strings; the cast is type-only.
type StringQuery = Record<string, string | undefined>;

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const startOfDay = (value: string | number | Date): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value: string | number | Date): Date => {
  const date = startOfDay(value);
  date.setDate(date.getDate() + 1);
  return date;
};

/**
 * Rejects a booking that overlaps another appointment for the same doctor.
 *
 * Nothing prevented double-booking before: a doctor could be given ten
 * appointments in the same slot.
 */
interface SlotCheck {
  tenantId: string;
  doctorId: Types.ObjectId | string;
  date: Date;
  time: string;
  duration?: number | null;
  ignoreId?: Types.ObjectId;
}

export const assertSlotIsFree = async ({ tenantId, doctorId, date, time, duration, ignoreId }: SlotCheck): Promise<void> => {
  const sameDay = await Appointment.find({
    tenantId,
    doctorId,
    appointmentDate: { $gte: startOfDay(date), $lt: endOfDay(date) },
    status: { $nin: ['Cancelled', 'No Show'] },
    ...(ignoreId ? { _id: { $ne: ignoreId } } : {})
  }).select('appointmentTime durationMinutes appointmentId');

  const newStart = toMinutes(time);
  const newEnd = newStart + (duration || 30);

  const clash = sameDay.find((existing) => {
    if (!HHMM.test(existing.appointmentTime)) return false;
    const start = toMinutes(existing.appointmentTime);
    const end = start + (existing.durationMinutes || 30);
    return newStart < end && start < newEnd;
  });

  if (clash) {
    throw ApiError.conflict(
      `This doctor already has an appointment at ${clash.appointmentTime} (${clash.appointmentId}). Please pick another slot.`
    );
  }
};

export const sendAppointmentEmails = (appointment: AppointmentDoc, patient: PatientDoc, doctor: UserDoc): void => {
  if (patient?.email) {
    sendMailAsync({
      to: patient.email,
      ...templates.appointmentForPatient({ appointment, patient, doctor })
    });
  }
  if (doctor?.email) {
    sendMailAsync({
      to: doctor.email,
      ...templates.appointmentForDoctor({ appointment, patient, doctor })
    });
  }
};

/** POST /api/appointments */
export const createAppointment = asyncHandler(async (req, res) => {
  const {
    patientId, doctorId, appointmentDate, appointmentTime,
    appointmentType, reason, symptoms, durationMinutes, amount
  } = req.body;

  if (!patientId || !doctorId || !appointmentDate || !appointmentTime || !reason) {
    throw ApiError.badRequest(
      'Patient, doctor, date, time and reason are required to book an appointment'
    );
  }
  if (!HHMM.test(appointmentTime)) {
    throw ApiError.badRequest('Appointment time must be in 24-hour HH:MM format');
  }

  const date = new Date(appointmentDate);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Appointment date is not valid');

  const [patient, doctor] = await Promise.all([
    Patient.findOne({ _id: patientId, tenantId: req.user.tenantId }),
    User.findOne({ _id: doctorId, tenantId: req.user.tenantId, roles: 'DOCTOR' })
  ]);

  if (!patient) throw ApiError.notFound('Patient not found');
  if (doctor === null) throw ApiError.notFound('Doctor not found');
  if (doctor.status !== 'ACTIVE') throw ApiError.badRequest('That doctor is not currently active');

  if (!isCrossDepartment(req.user) && patient.department !== req.user.department) {
    throw ApiError.forbidden(`You can only book appointments for ${req.user.department} patients`);
  }

  // A Cardiology patient should not be booked with an Orthopaedic surgeon.
  if (doctor.department !== patient.department) {
    throw ApiError.badRequest(
      `Dr. ${doctor.lastName} works in ${doctor.department} but this patient is registered under ${patient.department}.`
    );
  }

  await assertSlotIsFree({
    tenantId: req.user.tenantId,
    doctorId,
    date,
    time: appointmentTime,
    duration: durationMinutes || 30
  });

  const appointment = await Appointment.create({
    patientId,
    doctorId,
    appointmentDate: date,
    appointmentTime,
    durationMinutes: durationMinutes || 30,
    appointmentType: appointmentType || 'OPD',
    department: patient.department,
    reason,
    symptoms: symptoms || [],
    amount: amount ?? doctor.consultationFee ?? 0,
    tenantId: req.user.tenantId,
    status: 'Scheduled'
  });

  await appointment.populate([
    { path: 'patientId', select: 'firstName lastName patientId phone email department' },
    { path: 'doctorId', select: 'firstName lastName department email' }
  ]);

  sendAppointmentEmails(appointment, patient, doctor);

  logActivity({
    user: req.user,
    action: 'APPOINTMENT_CREATED',
    entityType: 'APPOINTMENT',
    entityId: appointment._id,
    description: `Booked ${appointment.appointmentId} for ${patient.firstName} ${patient.lastName} with Dr. ${doctor.lastName}`
  });

  res.status(201).json({ success: true, message: 'Appointment booked', appointment });
});

/** GET /api/appointments */
export const getAllAppointments = asyncHandler(async (req, res) => {
  const { status, department, date, from, to, doctorId, patientId } = req.query as StringQuery;
  const { page, limit, skip } = getPagination(req.query);

  const filter: Record<string, unknown> = { tenantId: req.user.tenantId };

  // A doctor's list is their own diary; a nurse sees their department.
  if (req.user.roles.includes('DOCTOR') && !isCrossDepartment(req.user)) {
    filter.doctorId = req.user.userId;
  } else if (!isCrossDepartment(req.user)) {
    filter.department = req.user.department;
  } else if (department && department !== 'All') {
    filter.department = department;
  }

  if (status && status !== 'All') filter.status = status;
  if (doctorId) filter.doctorId = doctorId;
  if (patientId) filter.patientId = patientId;

  if (date) {
    filter.appointmentDate = { $gte: startOfDay(date), $lt: endOfDay(date) };
  } else if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = startOfDay(from);
    if (to) range.$lt = endOfDay(to);
    filter.appointmentDate = range;
  }

  const [appointments, total, statusCounts] = await Promise.all([
    Appointment.find(filter)
      .populate('patientId', 'firstName lastName patientId phone email')
      .populate('doctorId', 'firstName lastName department specialization')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(filter),
    Appointment.aggregate<{ _id: string; count: number }>([
      { $match: { tenantId: req.user.tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  res.json({
    success: true,
    appointments,
    totalAppointments: total,
    currentPage: page,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    meta: buildMeta(total, page, limit),
    statusCounts: Object.fromEntries(statusCounts.map((entry) => [entry._id, entry.count]))
  });
});

/** GET /api/appointments/today */
export const getTodaysAppointments = asyncHandler(async (req, res) => {
  const today = startOfDay(new Date());

  const filter: Record<string, unknown> = {
    tenantId: req.user.tenantId,
    appointmentDate: { $gte: today, $lt: endOfDay(today) }
  };

  if (req.user.roles.includes('DOCTOR')) {
    filter.doctorId = req.user.userId;
  } else if (!isCrossDepartment(req.user)) {
    filter.department = req.user.department;
  }

  const appointments = await Appointment.find(filter)
    .populate('patientId', 'firstName lastName patientId phone')
    .populate('doctorId', 'firstName lastName department')
    .sort({ appointmentTime: 1 });

  res.json({
    success: true,
    date: today.toISOString().split('T')[0],
    count: appointments.length,
    appointments
  });
});

/** GET /api/appointments/patient/:patientId */
export const getAppointmentsByPatient = asyncHandler(async (req, res) => {
  const filter: Record<string, unknown> = { patientId: req.params.patientId, tenantId: req.user.tenantId };
  if (req.query.status) filter.status = req.query.status;

  const appointments = await Appointment.find(filter)
    .populate('patientId', 'firstName lastName patientId phone')
    .populate('doctorId', 'firstName lastName department email phone')
    .sort({ appointmentDate: -1 });

  res.json({ success: true, count: appointments.length, appointments });
});

/** GET /api/appointments/doctor/:doctorId */
export const getAppointmentsByDoctor = asyncHandler(async (req, res) => {
  const filter: Record<string, unknown> = { doctorId: req.params.doctorId, tenantId: req.user.tenantId };
  if (req.query.status) filter.status = req.query.status;
  const { date } = req.query as StringQuery;
  if (date) {
    filter.appointmentDate = { $gte: startOfDay(date), $lt: endOfDay(date) };
  }

  const appointments = await Appointment.find(filter)
    .populate('patientId', 'firstName lastName patientId phone dateOfBirth gender')
    .sort({ appointmentDate: 1, appointmentTime: 1 });

  res.json({ success: true, count: appointments.length, appointments });
});

/**
 * GET /api/appointments/availability?doctorId=&date=
 * Returns the doctor's open slots so the booking form can offer them instead of
 * letting the user guess and then rejecting the save.
 */
export const getDoctorAvailability = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query as StringQuery;
  if (!doctorId || !date) throw ApiError.badRequest('doctorId and date are both required');

  const doctor = await User.findOne({ _id: doctorId, tenantId: req.user.tenantId, roles: 'DOCTOR' });
  if (!doctor) throw ApiError.notFound('Doctor not found');

  res.json({
    success: true,
    doctor: { id: doctor._id, name: `${doctor.firstName} ${doctor.lastName}`, department: doctor.department },
    date,
    slots: await doctorSlots(req.user.tenantId, doctor, date)
  });
});

/** Half-hour slots across the doctor's working hours on `date`, each marked free or taken. */
export const doctorSlots = async (
  tenantId: string,
  doctor: UserDoc,
  date: string
): Promise<{ time: string; available: boolean }[]> => {
  const doctorId = doctor._id;
  const booked = await Appointment.find({
    tenantId,
    doctorId,
    appointmentDate: { $gte: startOfDay(date), $lt: endOfDay(date) },
    status: { $nin: ['Cancelled', 'No Show'] }
  }).select('appointmentTime durationMinutes');

  const taken = new Set<number>();
  for (const appointment of booked) {
    if (!HHMM.test(appointment.appointmentTime)) continue;
    const start = toMinutes(appointment.appointmentTime);
    for (let m = start; m < start + (appointment.durationMinutes || 30); m += 30) {
      taken.add(m - (m % 30));
    }
  }

  const availableFrom = doctor.availableFrom || '';
  const availableTo = doctor.availableTo || '';
  const from = toMinutes(HHMM.test(availableFrom) ? availableFrom : '09:00');
  const to = toMinutes(HHMM.test(availableTo) ? availableTo : '17:00');

  const slots: { time: string; available: boolean }[] = [];
  for (let minute = from; minute + 30 <= to; minute += 30) {
    slots.push({
      time: `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
      available: !taken.has(minute)
    });
  }
  return slots;
};

/** PATCH /api/appointments/:id/status */
export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status, doctorNotes, cancellationReason } = req.body;

  if (!(APPOINTMENT_STATUSES as readonly string[]).includes(status)) {
    throw ApiError.badRequest(`Status must be one of: ${APPOINTMENT_STATUSES.join(', ')}`);
  }

  const appointment = await Appointment.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!appointment) throw ApiError.notFound('Appointment not found');

  if (status === 'Cancelled' && !cancellationReason && !appointment.cancellationReason) {
    throw ApiError.badRequest('Please give a reason for the cancellation');
  }

  appointment.status = status;
  if (doctorNotes && req.user.roles.includes('DOCTOR')) appointment.doctorNotes = doctorNotes;
  if (cancellationReason) appointment.cancellationReason = cancellationReason;
  await appointment.save();

  logActivity({
    user: req.user,
    action: 'APPOINTMENT_STATUS_CHANGED',
    entityType: 'APPOINTMENT',
    entityId: appointment._id,
    description: `${appointment.appointmentId} marked ${status}`
  });

  res.json({ success: true, message: `Appointment marked ${status}`, appointment });
});

/** PUT /api/appointments/:id */
export const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!appointment) throw ApiError.notFound('Appointment not found');

  const {
    doctorId, appointmentDate, appointmentTime, reason, appointmentType,
    symptoms, status, doctorNotes, cancellationReason, durationMinutes
  } = req.body;

  if (appointmentTime && !HHMM.test(appointmentTime)) {
    throw ApiError.badRequest('Appointment time must be in 24-hour HH:MM format');
  }

  const nextDoctorId = doctorId || appointment.doctorId;
  const nextDate = appointmentDate ? new Date(appointmentDate) : appointment.appointmentDate;
  const nextTime = appointmentTime || appointment.appointmentTime;
  const nextDuration = durationMinutes || appointment.durationMinutes;

  const rescheduled =
    String(nextDoctorId) !== String(appointment.doctorId) ||
    nextDate.getTime() !== appointment.appointmentDate.getTime() ||
    nextTime !== appointment.appointmentTime;

  if (rescheduled) {
    await assertSlotIsFree({
      tenantId: req.user.tenantId,
      doctorId: nextDoctorId,
      date: nextDate,
      time: nextTime,
      duration: nextDuration,
      ignoreId: appointment._id
    });
  }

  if (doctorId && String(doctorId) !== String(appointment.doctorId)) {
    const doctor = await User.findOne({ _id: doctorId, tenantId: req.user.tenantId, roles: 'DOCTOR' });
    if (!doctor) throw ApiError.notFound('Doctor not found');
    appointment.doctorId = doctorId;
    appointment.department = doctor.department;
  }

  if (appointmentDate) appointment.appointmentDate = nextDate;
  if (appointmentTime) appointment.appointmentTime = appointmentTime;
  if (durationMinutes) appointment.durationMinutes = durationMinutes;
  if (reason) appointment.reason = reason;
  if (appointmentType) appointment.appointmentType = appointmentType;
  if (symptoms) appointment.symptoms = symptoms;
  if (status) appointment.status = status;
  if (doctorNotes !== undefined) appointment.doctorNotes = doctorNotes;
  if (cancellationReason !== undefined) appointment.cancellationReason = cancellationReason;

  await appointment.save();
  await appointment.populate([
    { path: 'patientId', select: 'firstName lastName patientId phone' },
    { path: 'doctorId', select: 'firstName lastName department' }
  ]);

  logActivity({
    user: req.user,
    action: 'APPOINTMENT_UPDATED',
    entityType: 'APPOINTMENT',
    entityId: appointment._id,
    description: `Updated appointment ${appointment.appointmentId}`
  });

  res.json({ success: true, message: 'Appointment updated', appointment });
});

/** DELETE /api/appointments/:id */
export const deleteAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOneAndDelete({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  if (!appointment) throw ApiError.notFound('Appointment not found');

  logActivity({
    user: req.user,
    action: 'APPOINTMENT_DELETED',
    entityType: 'APPOINTMENT',
    entityId: appointment._id,
    description: `Deleted appointment ${appointment.appointmentId}`
  });

  res.json({ success: true, message: 'Appointment deleted' });
});
