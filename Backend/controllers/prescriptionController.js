const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { logActivity } = require('../utils/activityLog');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { isCrossDepartment } = require('../middleware/abac');

const POPULATE = [
  { path: 'patientId', select: 'firstName lastName patientId phone dateOfBirth gender bloodGroup department allergies' },
  { path: 'doctorId', select: 'firstName lastName department specialization' },
  { path: 'dispensedBy', select: 'firstName lastName' }
];

/** POST /api/prescriptions - doctors only. */
const createPrescription = asyncHandler(async (req, res) => {
  const { patientId, diagnosis, symptoms, medicines, testsRecommended, followUpDate, notes, appointmentId } =
    req.body;

  if (!patientId || !diagnosis || !Array.isArray(medicines) || medicines.length === 0) {
    throw ApiError.badRequest('A patient, a diagnosis and at least one medicine are required');
  }

  for (const [index, medicine] of medicines.entries()) {
    if (!medicine.medicineName || !medicine.dosage || !medicine.frequency || !medicine.duration) {
      throw ApiError.badRequest(
        `Medicine ${index + 1} needs a name, dosage, frequency and duration`
      );
    }
    if (!medicine.quantity || medicine.quantity < 1) {
      throw ApiError.badRequest(`Medicine ${index + 1} needs a quantity of at least 1`);
    }
  }

  const patient = await Patient.findOne({ _id: patientId, tenantId: req.user.tenantId });
  if (!patient) throw ApiError.notFound('Patient not found');

  if (!isCrossDepartment(req.user) && patient.department !== req.user.department) {
    throw ApiError.forbidden(
      `You can only prescribe for patients in your own department (${req.user.department})`
    );
  }

  // Warn - do not block - when a prescribed drug is on the patient's allergy list.
  const allergyWarnings = (patient.allergies || []).filter((allergy) =>
    medicines.some((medicine) =>
      medicine.medicineName.toLowerCase().includes(String(allergy).toLowerCase())
    )
  );

  const prescription = await Prescription.create({
    patientId,
    doctorId: req.user.userId,
    appointmentId: appointmentId || undefined,
    diagnosis,
    symptoms: symptoms || [],
    medicines,
    testsRecommended: testsRecommended || [],
    followUpDate: followUpDate ? new Date(followUpDate) : undefined,
    notes: notes || '',
    department: patient.department,
    tenantId: req.user.tenantId,
    status: 'Active'
  });

  await prescription.populate(POPULATE);

  logActivity({
    user: req.user,
    action: 'PRESCRIPTION_CREATED',
    entityType: 'PRESCRIPTION',
    entityId: prescription._id,
    description: `Prescribed ${medicines.length} medicine(s) for ${patient.firstName} ${patient.lastName} (${prescription.prescriptionId})`
  });

  res.status(201).json({
    success: true,
    message: 'Prescription created',
    prescription,
    ...(allergyWarnings.length
      ? {
          warnings: [
            `This patient has a recorded allergy to: ${allergyWarnings.join(', ')}. Please double-check the prescription.`
          ]
        }
      : {})
  });
});

/** GET /api/prescriptions */
const getAllPrescriptions = asyncHandler(async (req, res) => {
  const { status, pharmacyStatus, search, patientId, doctorId } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = { tenantId: req.user.tenantId };

  // Doctors see what they wrote; nurses see their department; admins and
  // pharmacists see everything.
  if (req.user.roles.includes('DOCTOR') && !isCrossDepartment(req.user)) {
    filter.doctorId = req.user.userId;
  } else if (!isCrossDepartment(req.user)) {
    filter.department = req.user.department;
  }

  if (status && status !== 'All') filter.status = status;
  if (pharmacyStatus && pharmacyStatus !== 'All') filter.pharmacyStatus = pharmacyStatus;
  if (patientId) filter.patientId = patientId;
  if (doctorId) filter.doctorId = doctorId;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ prescriptionId: pattern }, { diagnosis: pattern }];
  }

  const [prescriptions, total, statusCounts] = await Promise.all([
    Prescription.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Prescription.countDocuments(filter),
    Prescription.aggregate([
      { $match: { tenantId: req.user.tenantId } },
      { $group: { _id: '$pharmacyStatus', count: { $sum: 1 } } }
    ])
  ]);

  res.json({
    success: true,
    prescriptions,
    totalPrescriptions: total,
    currentPage: page,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    meta: buildMeta(total, page, limit),
    pharmacyCounts: Object.fromEntries(statusCounts.map((entry) => [entry._id, entry.count]))
  });
});

/** GET /api/prescriptions/patient/:patientId */
const getPrescriptionsByPatient = asyncHandler(async (req, res) => {
  const filter = { patientId: req.params.patientId, tenantId: req.user.tenantId };
  if (req.query.status) filter.status = req.query.status;

  const prescriptions = await Prescription.find(filter).populate(POPULATE).sort({ createdAt: -1 });

  res.json({ success: true, count: prescriptions.length, prescriptions });
});

/** GET /api/prescriptions/:id */
const getPrescriptionById = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate(POPULATE);

  if (!prescription) throw ApiError.notFound('Prescription not found');

  if (!isCrossDepartment(req.user) && prescription.department !== req.user.department) {
    throw ApiError.forbidden(
      `You can only view prescriptions from your own department (${req.user.department})`
    );
  }

  res.json({ success: true, prescription });
});

/** PUT /api/prescriptions/:id - the prescribing doctor may revise until it is dispensed. */
const updatePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  if (!prescription) throw ApiError.notFound('Prescription not found');

  const isOwner = String(prescription.doctorId) === req.user.userId;
  if (!isOwner && !req.user.roles.includes('HOSPITAL_ADMIN')) {
    throw ApiError.forbidden('Only the prescribing doctor can edit this prescription');
  }
  if (prescription.pharmacyStatus === 'Dispensed') {
    throw ApiError.badRequest('This prescription has already been dispensed and can no longer be edited');
  }

  const editable = ['diagnosis', 'symptoms', 'medicines', 'testsRecommended', 'notes', 'status'];
  for (const field of editable) {
    if (req.body[field] !== undefined) prescription[field] = req.body[field];
  }
  if (req.body.followUpDate !== undefined) {
    prescription.followUpDate = req.body.followUpDate ? new Date(req.body.followUpDate) : undefined;
  }

  await prescription.save();
  await prescription.populate(POPULATE);

  logActivity({
    user: req.user,
    action: 'PRESCRIPTION_UPDATED',
    entityType: 'PRESCRIPTION',
    entityId: prescription._id,
    description: `Updated prescription ${prescription.prescriptionId}`
  });

  res.json({ success: true, message: 'Prescription updated', prescription });
});

/** PUT /api/prescriptions/:id/status - pharmacy workflow state. */
const updatePrescriptionStatus = asyncHandler(async (req, res) => {
  const { pharmacyStatus, status } = req.body;

  const prescription = await Prescription.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  if (!prescription) throw ApiError.notFound('Prescription not found');

  if (pharmacyStatus) {
    if (!req.user.roles.some((role) => ['PHARMACIST', 'HOSPITAL_ADMIN'].includes(role))) {
      throw ApiError.forbidden('Only the pharmacy can change the dispensing status');
    }
    prescription.pharmacyStatus = pharmacyStatus;
  }
  if (status) prescription.status = status;

  await prescription.save();

  res.json({ success: true, message: 'Prescription status updated', prescription });
});

/** DELETE /api/prescriptions/:id */
const deletePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  if (!prescription) throw ApiError.notFound('Prescription not found');

  if (prescription.pharmacyStatus !== 'Pending') {
    throw ApiError.badRequest('A prescription that has reached the pharmacy cannot be deleted. Cancel it instead.');
  }

  await prescription.deleteOne();

  logActivity({
    user: req.user,
    action: 'PRESCRIPTION_DELETED',
    entityType: 'PRESCRIPTION',
    entityId: prescription._id,
    description: `Deleted prescription ${prescription.prescriptionId}`
  });

  res.json({ success: true, message: 'Prescription deleted' });
});

/**
 * GET /api/prescriptions/:id/stock-check
 * Tells the pharmacist, line by line, whether the prescription can be filled
 * from current inventory before they commit to dispensing it.
 */
const checkStock = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  });
  if (!prescription) throw ApiError.notFound('Prescription not found');

  const lines = await Promise.all(
    prescription.medicines.map(async (line) => {
      const stock = await Medicine.findOne({
        tenantId: req.user.tenantId,
        $or: [
          ...(line.medicine ? [{ _id: line.medicine }] : []),
          { name: new RegExp(`^${escapeRegex(line.medicineName)}$`, 'i') }
        ]
      });

      const outstanding = line.quantity - (line.quantityDispensed || 0);
      return {
        lineId: line._id,
        medicineName: line.medicineName,
        required: outstanding,
        inStock: stock?.stockQuantity ?? 0,
        unitPrice: stock?.unitPrice ?? 0,
        medicineId: stock?._id,
        inInventory: Boolean(stock),
        sufficient: Boolean(stock) && stock.stockQuantity >= outstanding
      };
    })
  );

  res.json({
    success: true,
    prescriptionId: prescription.prescriptionId,
    canDispenseFully: lines.every((line) => line.sufficient || line.required <= 0),
    lines
  });
});

module.exports = {
  createPrescription,
  getAllPrescriptions,
  getPrescriptionsByPatient,
  getPrescriptionById,
  updatePrescription,
  updatePrescriptionStatus,
  deletePrescription,
  checkStock
};
