const Vitals = require('../models/Vitals');
const Patient = require('../models/Patient');
const Admission = require('../models/Admission');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { logActivity } = require('../utils/activityLog');
const { assessVitals, rangesFor } = require('../utils/vitalRanges');
const { isCrossDepartment } = require('../middleware/abac');

const MEASURED_FIELDS = [
  'temperature', 'pulse', 'systolic', 'diastolic', 'respiratoryRate',
  'oxygenSaturation', 'bloodSugar', 'weight', 'height', 'painScore'
];

const ageOf = (patient) => {
  if (!patient?.dateOfBirth) return null;
  return Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 86400000));
};

/** Adds the flags to a stored reading without persisting them - ranges may change. */
const decorate = (reading, ageYears) => {
  const plain = reading.toJSON ? reading.toJSON() : reading;
  return { ...plain, assessment: assessVitals(plain, ageYears) };
};

const loadPatient = async (req) => {
  const patient = await Patient.findOne({
    _id: req.params.patientId,
    tenantId: req.user.tenantId
  });
  if (!patient) throw ApiError.notFound('Patient not found');

  // Same department rule as everywhere else: clinical staff stay in their lane.
  if (!isCrossDepartment(req.user) && patient.department !== req.user.department) {
    throw ApiError.forbidden(
      `This patient belongs to ${patient.department}. You can only record vitals for ${req.user.department} patients.`
    );
  }
  return patient;
};

/** POST /api/patients/:patientId/vitals */
const recordVitals = asyncHandler(async (req, res) => {
  const patient = await loadPatient(req);

  const reading = {};
  for (const field of MEASURED_FIELDS) {
    const value = req.body[field];
    if (value === undefined || value === null || value === '') continue;

    const number = Number(value);
    if (Number.isNaN(number)) throw ApiError.badRequest(`"${field}" must be a number`);
    reading[field] = number;
  }

  if (Object.keys(reading).length === 0) {
    throw ApiError.badRequest('Record at least one measurement');
  }
  if ((reading.systolic && !reading.diastolic) || (reading.diastolic && !reading.systolic)) {
    throw ApiError.badRequest('Blood pressure needs both the systolic and the diastolic value');
  }
  if (reading.systolic && reading.diastolic && reading.diastolic >= reading.systolic) {
    throw ApiError.badRequest('The diastolic value must be lower than the systolic value');
  }

  // Link the reading to the current inpatient stay, if there is one.
  const admission = await Admission.findOne({
    patient: patient._id,
    tenantId: req.user.tenantId,
    status: 'Active'
  }).select('_id');

  const vitals = await Vitals.create({
    ...reading,
    patient: patient._id,
    admission: admission?._id,
    recordedBy: req.user.userId,
    recordedAt: req.body.recordedAt ? new Date(req.body.recordedAt) : new Date(),
    notes: req.body.notes,
    tenantId: req.user.tenantId
  });

  await vitals.populate('recordedBy', 'firstName lastName roles');

  const assessment = assessVitals(reading, ageOf(patient));

  logActivity({
    user: req.user,
    action: 'VITALS_RECORDED',
    entityType: 'PATIENT',
    entityId: patient._id,
    description: assessment.hasCritical
      ? `Recorded vitals for ${patient.firstName} ${patient.lastName} - critical: ${assessment.summary.join(', ')}`
      : `Recorded vitals for ${patient.firstName} ${patient.lastName}`
  });

  res.status(201).json({
    success: true,
    message: assessment.abnormalCount
      ? `Saved. ${assessment.abnormalCount} reading(s) outside the normal range.`
      : 'Vitals recorded',
    vitals: decorate(vitals, ageOf(patient)),
    assessment
  });
});

/** GET /api/patients/:patientId/vitals - newest first, with the trend series. */
const listVitals = asyncHandler(async (req, res) => {
  const patient = await loadPatient(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const readings = await Vitals.find({ patient: patient._id, tenantId: req.user.tenantId })
    .populate('recordedBy', 'firstName lastName roles')
    .sort({ recordedAt: -1 })
    .limit(limit);

  const ageYears = ageOf(patient);
  const decorated = readings.map((reading) => decorate(reading, ageYears));

  // Oldest first for charting, so the line reads left to right in time order.
  const trend = [...decorated].reverse().map((reading) => ({
    recordedAt: reading.recordedAt,
    temperature: reading.temperature ?? null,
    pulse: reading.pulse ?? null,
    systolic: reading.systolic ?? null,
    diastolic: reading.diastolic ?? null,
    oxygenSaturation: reading.oxygenSaturation ?? null,
    bloodSugar: reading.bloodSugar ?? null
  }));

  res.json({
    success: true,
    count: decorated.length,
    patient: {
      id: patient._id,
      name: `${patient.firstName} ${patient.lastName}`,
      patientId: patient.patientId,
      age: ageYears
    },
    latest: decorated[0] || null,
    vitals: decorated,
    trend,
    referenceRanges: rangesFor(ageYears)
  });
});

/** DELETE /api/vitals/:id - for a mistyped reading. */
const deleteVitals = asyncHandler(async (req, res) => {
  const reading = await Vitals.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!reading) throw ApiError.notFound('Reading not found');

  const isOwn = String(reading.recordedBy) === req.user.userId;
  if (!isOwn && !req.user.roles.includes('HOSPITAL_ADMIN')) {
    throw ApiError.forbidden('Only the person who recorded a reading, or an administrator, can remove it');
  }

  await reading.deleteOne();
  res.json({ success: true, message: 'Reading removed' });
});

/**
 * GET /api/vitals/attention
 * The nurse's worklist: inpatients whose most recent observations were
 * abnormal, and inpatients with no observations recorded today at all.
 */
const needsAttention = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.user.tenantId, status: 'Active' };
  if (!isCrossDepartment(req.user)) filter.department = req.user.department;

  const admissions = await Admission.find(filter)
    .populate('patient', 'firstName lastName patientId department dateOfBirth')
    .populate('ward', 'name code')
    .populate('bed', 'bedNumber')
    .limit(100);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const rows = await Promise.all(
    admissions
      .filter((admission) => admission.patient)
      .map(async (admission) => {
        const latest = await Vitals.findOne({
          patient: admission.patient._id,
          tenantId: req.user.tenantId
        }).sort({ recordedAt: -1 });

        const ageYears = ageOf(admission.patient);
        const assessment = latest ? assessVitals(latest.toJSON(), ageYears) : null;

        return {
          admissionId: admission.admissionId,
          patient: {
            id: admission.patient._id,
            name: `${admission.patient.firstName} ${admission.patient.lastName}`,
            patientId: admission.patient.patientId,
            department: admission.patient.department
          },
          location: `${admission.ward?.code || ''} / ${admission.bed?.bedNumber || ''}`.trim(),
          lastRecordedAt: latest?.recordedAt || null,
          overdue: !latest || latest.recordedAt < startOfToday,
          assessment
        };
      })
  );

  // Critical first, then abnormal, then simply overdue.
  const score = (row) => {
    if (row.assessment?.hasCritical) return 0;
    if (row.assessment?.abnormalCount) return 1;
    if (row.overdue) return 2;
    return 3;
  };

  const attention = rows.filter((row) => score(row) < 3).sort((a, b) => score(a) - score(b));

  res.json({
    success: true,
    count: attention.length,
    inpatients: rows.length,
    attention
  });
});

module.exports = { recordVitals, listVitals, deleteVitals, needsAttention };
