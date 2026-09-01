const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Billing = require('../models/Billing');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { logActivity } = require('../utils/activityLog');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { isCrossDepartment } = require('../middleware/abac');

/** POST /api/patients */
const registerPatient = asyncHandler(async (req, res) => {
  const { firstName, lastName, dateOfBirth, gender, phone } = req.body;

  if (!firstName || !lastName || !dateOfBirth || !gender || !phone) {
    throw ApiError.badRequest(
      'First name, last name, date of birth, gender and phone number are required'
    );
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) throw ApiError.badRequest('Date of birth is not a valid date');
  if (dob > new Date()) throw ApiError.badRequest('Date of birth cannot be in the future');

  const duplicate = await Patient.findOne({ phone: req.body.phone, tenantId: req.user.tenantId });
  if (duplicate) {
    throw ApiError.conflict(
      `${duplicate.firstName} ${duplicate.lastName} (${duplicate.patientId}) is already registered with this phone number`
    );
  }

  if (req.body.assignedDoctor) {
    const doctor = await User.findOne({
      _id: req.body.assignedDoctor,
      tenantId: req.user.tenantId,
      roles: 'DOCTOR'
    });
    if (!doctor) throw ApiError.badRequest('The selected doctor was not found');
  }

  const patient = await Patient.create({
    firstName,
    lastName,
    dateOfBirth: dob,
    gender,
    bloodGroup: req.body.bloodGroup || 'Unknown',
    phone: req.body.phone,
    email: req.body.email || undefined,
    address: req.body.address || {},
    emergencyContact: req.body.emergencyContact || {},
    allergies: req.body.allergies || [],
    chronicConditions: req.body.chronicConditions || [],
    currentMedications: req.body.currentMedications || [],
    patientType: req.body.patientType || 'OPD',
    // departmentAccessControl has already defaulted this to the caller's
    // department for clinical staff.
    department: req.body.department || 'General',
    assignedDoctor: req.body.assignedDoctor || undefined,
    admissionDate: req.body.patientType === 'IPD' ? req.body.admissionDate || new Date() : undefined,
    roomNumber: req.body.roomNumber,
    notes: req.body.notes,
    tenantId: req.user.tenantId,
    status: 'Active'
  });

  logActivity({
    user: req.user,
    action: 'PATIENT_CREATED',
    entityType: 'PATIENT',
    entityId: patient._id,
    description: `Registered ${patient.patientType} patient ${patient.firstName} ${patient.lastName} (${patient.patientId})`
  });

  res.status(201).json({ success: true, message: 'Patient registered', patient });
});

/** GET /api/patients */
const getAllPatients = asyncHandler(async (req, res) => {
  const { search, patientType, department, status, bloodGroup, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = { tenantId: req.user.tenantId };

  // Clinical staff only ever see their own department's patients. This used to
  // be enforced on single-record routes only, so the list endpoint leaked every
  // department to every doctor.
  if (!isCrossDepartment(req.user)) {
    filter.department = req.user.department;
  } else if (department && department !== 'All') {
    filter.department = department;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { firstName: pattern },
      { lastName: pattern },
      { phone: pattern },
      { patientId: pattern },
      { email: pattern }
    ];
  }
  if (patientType && patientType !== 'All') filter.patientType = patientType;
  if (status && status !== 'All') filter.status = status;
  if (bloodGroup && bloodGroup !== 'All') filter.bloodGroup = bloodGroup;

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name: { firstName: 1, lastName: 1 }
  };

  const [patients, total, stats] = await Promise.all([
    Patient.find(filter)
      .populate('assignedDoctor', 'firstName lastName department specialization')
      .sort(sortMap[sort] || sortMap.newest)
      .skip(skip)
      .limit(limit),
    Patient.countDocuments(filter),
    Patient.aggregate([
      { $match: { tenantId: req.user.tenantId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          opd: { $sum: { $cond: [{ $eq: ['$patientType', 'OPD'] }, 1, 0] } },
          ipd: { $sum: { $cond: [{ $eq: ['$patientType', 'IPD'] }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } }
        }
      }
    ])
  ]);

  res.json({
    success: true,
    patients,
    // Legacy field names the current frontend still reads.
    totalPatients: total,
    currentPage: page,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    meta: buildMeta(total, page, limit),
    stats: stats[0] || { total: 0, opd: 0, ipd: 0, active: 0 }
  });
});

/** GET /api/patients/:id - the record plus its clinical and financial history. */
const getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate('assignedDoctor', 'firstName lastName department specialization phone email');

  if (!patient) throw ApiError.notFound('Patient not found');

  if (!isCrossDepartment(req.user) && patient.department !== req.user.department) {
    throw ApiError.forbidden(
      `This patient belongs to ${patient.department}. You can only view ${req.user.department} patients.`
    );
  }

  const [appointments, prescriptions, invoices] = await Promise.all([
    Appointment.find({ patientId: patient._id, tenantId: req.user.tenantId })
      .populate('doctorId', 'firstName lastName department')
      .sort({ appointmentDate: -1 })
      .limit(10),
    Prescription.find({ patientId: patient._id, tenantId: req.user.tenantId })
      .populate('doctorId', 'firstName lastName department')
      .sort({ createdAt: -1 })
      .limit(10),
    Billing.find({ patientId: patient._id, tenantId: req.user.tenantId })
      .sort({ invoiceDate: -1 })
      .limit(10)
  ]);

  const outstanding = invoices.reduce((sum, invoice) => sum + (invoice.balanceAmount || 0), 0);

  res.json({
    success: true,
    patient,
    history: { appointments, prescriptions, invoices },
    summary: {
      appointmentCount: appointments.length,
      prescriptionCount: prescriptions.length,
      outstandingBalance: Number(outstanding.toFixed(2))
    }
  });
});

/** PUT /api/patients/:id */
const updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!patient) throw ApiError.notFound('Patient not found');

  if (!isCrossDepartment(req.user) && patient.department !== req.user.department) {
    throw ApiError.forbidden(`You can only edit ${req.user.department} patients`);
  }

  // Explicit allow-list. The old code copied every key from the body onto the
  // document, so a client could rewrite `status`, `_id` or arbitrary fields.
  const editable = [
    'firstName', 'lastName', 'dateOfBirth', 'gender', 'bloodGroup', 'phone', 'email',
    'address', 'emergencyContact', 'allergies', 'chronicConditions', 'currentMedications',
    'patientType', 'department', 'assignedDoctor', 'status', 'roomNumber',
    'admissionDate', 'dischargeDate', 'notes'
  ];

  for (const field of editable) {
    if (req.body[field] !== undefined) patient[field] = req.body[field];
  }

  if (req.body.phone && req.body.phone !== patient.phone) {
    const clash = await Patient.findOne({
      phone: req.body.phone,
      tenantId: req.user.tenantId,
      _id: { $ne: patient._id }
    });
    if (clash) throw ApiError.conflict('Another patient already uses this phone number');
  }

  await patient.save();

  logActivity({
    user: req.user,
    action: 'PATIENT_UPDATED',
    entityType: 'PATIENT',
    entityId: patient._id,
    description: `Updated patient ${patient.firstName} ${patient.lastName} (${patient.patientId})`
  });

  res.json({ success: true, message: 'Patient updated', patient });
});

/** POST /api/patients/:id/discharge - IPD discharge. */
const dischargePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!patient) throw ApiError.notFound('Patient not found');
  if (patient.status === 'Discharged') throw ApiError.badRequest('This patient is already discharged');

  patient.status = 'Discharged';
  patient.dischargeDate = new Date();
  if (req.body.notes) patient.notes = req.body.notes;
  await patient.save();

  logActivity({
    user: req.user,
    action: 'PATIENT_DISCHARGED',
    entityType: 'PATIENT',
    entityId: patient._id,
    description: `Discharged ${patient.firstName} ${patient.lastName} (${patient.patientId})`
  });

  res.json({ success: true, message: 'Patient discharged', patient });
});

/**
 * DELETE /api/patients/:id
 *
 * The frontend has always had a delete button; the route simply did not exist,
 * so it returned 404 every time. Patients with clinical history are archived
 * instead of destroyed, because deleting them would orphan invoices.
 */
const deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!patient) throw ApiError.notFound('Patient not found');

  const [appointments, prescriptions, invoices] = await Promise.all([
    Appointment.countDocuments({ patientId: patient._id }),
    Prescription.countDocuments({ patientId: patient._id }),
    Billing.countDocuments({ patientId: patient._id })
  ]);

  const linkedRecords = appointments + prescriptions + invoices;

  if (linkedRecords > 0) {
    patient.status = 'Inactive';
    await patient.save();
    return res.json({
      success: true,
      archived: true,
      message: `${patient.firstName} has ${linkedRecords} linked record(s), so the file was archived instead of deleted.`
    });
  }

  await patient.deleteOne();

  logActivity({
    user: req.user,
    action: 'PATIENT_DELETED',
    entityType: 'PATIENT',
    entityId: patient._id,
    description: `Deleted patient record ${patient.patientId}`
  });

  res.json({ success: true, message: 'Patient record deleted' });
});

module.exports = {
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  dischargePatient,
  deletePatient
};
