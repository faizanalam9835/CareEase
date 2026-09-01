const Ward = require('../models/Ward');
const Bed = require('../models/Bed');
const Admission = require('../models/Admission');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Billing = require('../models/Billing');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { logActivity } = require('../utils/activityLog');
const { withTransaction } = require('../utils/transactions');
const { getPagination, buildMeta } = require('../utils/pagination');
const { WARD_TYPES } = require('../config/constants');

/** "ICU-1 / 04" - the label a person would say out loud. */
const bedLabel = (ward, bed) => `${ward?.code || ward?.name || 'Ward'} / ${bed.bedNumber}`;

/* --------------------------------- wards --------------------------------- */

/** GET /api/wards - every ward with its live bed counts. */
const listWards = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.user.tenantId };
  if (req.query.department && req.query.department !== 'All') {
    filter.department = req.query.department;
  }
  if (req.query.status && req.query.status !== 'All') filter.status = req.query.status;

  const wards = await Ward.find(filter).sort({ name: 1 }).lean();

  const counts = await Bed.aggregate([
    { $match: { tenantId: req.user.tenantId } },
    { $group: { _id: { ward: '$ward', status: '$status' }, count: { $sum: 1 } } }
  ]);

  const byWard = new Map();
  for (const entry of counts) {
    const key = String(entry._id.ward);
    const bucket = byWard.get(key) || { total: 0, Available: 0, Occupied: 0, Reserved: 0, Maintenance: 0 };
    bucket[entry._id.status] = entry.count;
    bucket.total += entry.count;
    byWard.set(key, bucket);
  }

  const withCounts = wards.map((ward) => {
    const bucket = byWard.get(String(ward._id)) || {
      total: 0, Available: 0, Occupied: 0, Reserved: 0, Maintenance: 0
    };
    return {
      ...ward,
      bedCounts: bucket,
      occupancyRate: bucket.total ? Number(((bucket.Occupied / bucket.total) * 100).toFixed(1)) : 0
    };
  });

  const totals = withCounts.reduce(
    (acc, ward) => ({
      beds: acc.beds + ward.bedCounts.total,
      occupied: acc.occupied + ward.bedCounts.Occupied,
      available: acc.available + ward.bedCounts.Available,
      outOfService: acc.outOfService + ward.bedCounts.Maintenance
    }),
    { beds: 0, occupied: 0, available: 0, outOfService: 0 }
  );

  res.json({
    success: true,
    count: withCounts.length,
    wards: withCounts,
    totals: {
      ...totals,
      occupancyRate: totals.beds ? Number(((totals.occupied / totals.beds) * 100).toFixed(1)) : 0
    }
  });
});

/** GET /api/wards/:id - one ward and every bed in it. */
const getWard = asyncHandler(async (req, res) => {
  const ward = await Ward.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!ward) throw ApiError.notFound('Ward not found');

  const beds = await Bed.find({ ward: ward._id, tenantId: req.user.tenantId })
    .populate('currentPatient', 'firstName lastName patientId phone gender dateOfBirth')
    .populate({
      path: 'currentAdmission',
      select: 'admissionId admittedAt reason attendingDoctor dailyRate',
      populate: { path: 'attendingDoctor', select: 'firstName lastName' }
    })
    .sort({ bedNumber: 1 });

  res.json({ success: true, ward, beds });
});

/** POST /api/wards - creates the ward and, optionally, its beds in one go. */
const createWard = asyncHandler(async (req, res) => {
  const { name, code, type, department, floor, dailyRate, bedCount, bedPrefix } = req.body;

  if (!name || !code) throw ApiError.badRequest('A ward needs a name and a short code');
  if (type && !WARD_TYPES.includes(type)) {
    throw ApiError.badRequest(`Ward type must be one of: ${WARD_TYPES.join(', ')}`);
  }

  const clash = await Ward.findOne({ tenantId: req.user.tenantId, code: String(code).toUpperCase() });
  if (clash) throw ApiError.conflict(`Ward code "${clash.code}" is already in use`);

  const ward = await Ward.create({
    name,
    code,
    type: type || 'General',
    department: department || 'General',
    floor,
    dailyRate: dailyRate || 0,
    notes: req.body.notes,
    tenantId: req.user.tenantId
  });

  // Creating a 20-bed ward one bed at a time would be tedious, so the caller
  // can ask for them up front.
  let beds = [];
  const count = Number(bedCount) || 0;
  if (count > 0) {
    if (count > 200) throw ApiError.badRequest('A ward can be created with at most 200 beds at once');
    beds = await Bed.insertMany(
      Array.from({ length: count }, (_, index) => ({
        bedNumber: `${bedPrefix || ''}${String(index + 1).padStart(2, '0')}`,
        ward: ward._id,
        dailyRate: ward.dailyRate,
        tenantId: req.user.tenantId
      }))
    );
  }

  logActivity({
    user: req.user,
    action: 'WARD_CREATED',
    entityType: 'WARD',
    entityId: ward._id,
    description: `Created ward ${ward.name} (${ward.code}) with ${beds.length} bed(s)`
  });

  res.status(201).json({ success: true, message: 'Ward created', ward, beds });
});

/** PUT /api/wards/:id */
const updateWard = asyncHandler(async (req, res) => {
  const ward = await Ward.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!ward) throw ApiError.notFound('Ward not found');

  for (const field of ['name', 'type', 'department', 'floor', 'dailyRate', 'notes', 'status']) {
    if (req.body[field] !== undefined) ward[field] = req.body[field];
  }
  await ward.save();

  res.json({ success: true, message: 'Ward updated', ward });
});

/** DELETE /api/wards/:id - refused while anyone is still in it. */
const deleteWard = asyncHandler(async (req, res) => {
  const ward = await Ward.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!ward) throw ApiError.notFound('Ward not found');

  const occupied = await Bed.countDocuments({ ward: ward._id, status: 'Occupied' });
  if (occupied > 0) {
    throw ApiError.badRequest(
      `${occupied} bed(s) in this ward are still occupied. Discharge or transfer those patients first.`
    );
  }

  await Bed.deleteMany({ ward: ward._id, tenantId: req.user.tenantId });
  await ward.deleteOne();

  res.json({ success: true, message: 'Ward and its beds removed' });
});

/* --------------------------------- beds ---------------------------------- */

/** POST /api/wards/:id/beds */
const addBed = asyncHandler(async (req, res) => {
  const ward = await Ward.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!ward) throw ApiError.notFound('Ward not found');

  const { bedNumber, dailyRate } = req.body;
  if (!bedNumber) throw ApiError.badRequest('A bed needs a number');

  const clash = await Bed.findOne({
    tenantId: req.user.tenantId,
    ward: ward._id,
    bedNumber: String(bedNumber).trim()
  });
  if (clash) throw ApiError.conflict(`Bed ${bedNumber} already exists in ${ward.name}`);

  const bed = await Bed.create({
    bedNumber: String(bedNumber).trim(),
    ward: ward._id,
    dailyRate: dailyRate ?? ward.dailyRate,
    tenantId: req.user.tenantId
  });

  res.status(201).json({ success: true, message: 'Bed added', bed });
});

/** PUT /api/beds/:id - rate, notes, and taking a bed in or out of service. */
const updateBed = asyncHandler(async (req, res) => {
  const bed = await Bed.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!bed) throw ApiError.notFound('Bed not found');

  const { status, dailyRate, notes } = req.body;

  if (status && status !== bed.status) {
    // Occupancy is owned by the admission workflow: a bed becomes Occupied by
    // admitting someone and Available by discharging them, never by hand.
    if (status === 'Occupied' || bed.status === 'Occupied') {
      throw ApiError.badRequest(
        'Use admit, transfer or discharge to change whether a bed is occupied'
      );
    }
    bed.status = status;
  }

  if (dailyRate !== undefined) bed.dailyRate = dailyRate;
  if (notes !== undefined) bed.notes = notes;
  await bed.save();

  res.json({ success: true, message: 'Bed updated', bed });
});

/** DELETE /api/beds/:id */
const deleteBed = asyncHandler(async (req, res) => {
  const bed = await Bed.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!bed) throw ApiError.notFound('Bed not found');
  if (bed.status === 'Occupied') throw ApiError.badRequest('This bed is occupied');

  await bed.deleteOne();
  res.json({ success: true, message: 'Bed removed' });
});

/** GET /api/beds/available - the picker used by the admit and transfer forms. */
const availableBeds = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.user.tenantId, status: 'Available' };

  const wardFilter = { tenantId: req.user.tenantId, status: 'Active' };
  if (req.query.department && req.query.department !== 'All') {
    wardFilter.department = req.query.department;
  }
  const wards = await Ward.find(wardFilter).select('_id name code type department dailyRate');
  filter.ward = { $in: wards.map((ward) => ward._id) };

  const beds = await Bed.find(filter).populate('ward', 'name code type department dailyRate').sort({ bedNumber: 1 });

  res.json({
    success: true,
    count: beds.length,
    beds: beds.map((bed) => ({
      _id: bed._id,
      bedNumber: bed.bedNumber,
      label: bedLabel(bed.ward, bed),
      ward: bed.ward,
      dailyRate: bed.dailyRate || bed.ward?.dailyRate || 0
    }))
  });
});

/* ------------------------------ admissions ------------------------------- */

/** GET /api/admissions */
const listAdmissions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const filter = { tenantId: req.user.tenantId };
  if (req.query.status && req.query.status !== 'All') filter.status = req.query.status;
  if (req.query.patient) filter.patient = req.query.patient;

  const [admissions, total] = await Promise.all([
    Admission.find(filter)
      .populate('patient', 'firstName lastName patientId phone gender dateOfBirth')
      .populate('ward', 'name code type')
      .populate('bed', 'bedNumber')
      .populate('attendingDoctor', 'firstName lastName department')
      .sort({ admittedAt: -1 })
      .skip(skip)
      .limit(limit),
    Admission.countDocuments(filter)
  ]);

  res.json({ success: true, admissions, meta: buildMeta(total, page, limit) });
});

/**
 * POST /api/admissions
 * Admits a patient into a specific bed. Bed occupancy and the patient's own
 * record are updated together, so the two cannot drift apart.
 */
const admitPatient = asyncHandler(async (req, res) => {
  const { patientId, bedId, reason, diagnosis, attendingDoctor, notes } = req.body;

  if (!patientId || !bedId || !reason) {
    throw ApiError.badRequest('A patient, a bed and a reason for admission are required');
  }

  const [patient, bed] = await Promise.all([
    Patient.findOne({ _id: patientId, tenantId: req.user.tenantId }),
    Bed.findOne({ _id: bedId, tenantId: req.user.tenantId }).populate('ward')
  ]);

  if (!patient) throw ApiError.notFound('Patient not found');
  if (!bed) throw ApiError.notFound('Bed not found');
  if (bed.status !== 'Available') {
    throw ApiError.conflict(`That bed is ${bed.status.toLowerCase()} - pick another one`);
  }

  const openStay = await Admission.findOne({
    patient: patient._id,
    tenantId: req.user.tenantId,
    status: 'Active'
  });
  if (openStay) {
    throw ApiError.conflict(
      `${patient.firstName} ${patient.lastName} is already admitted (${openStay.admissionId}). Discharge or transfer them first.`
    );
  }

  if (attendingDoctor) {
    const doctor = await User.findOne({
      _id: attendingDoctor,
      tenantId: req.user.tenantId,
      roles: 'DOCTOR'
    });
    if (!doctor) throw ApiError.badRequest('The selected attending doctor was not found');
  }

  const dailyRate = bed.dailyRate || bed.ward?.dailyRate || 0;

  const admission = await withTransaction(async (options) => {
    const [created] = await Admission.create(
      [
        {
          patient: patient._id,
          bed: bed._id,
          ward: bed.ward._id,
          attendingDoctor: attendingDoctor || patient.assignedDoctor || undefined,
          department: patient.department,
          reason,
          diagnosis,
          notes,
          admittedBy: req.user.userId,
          dailyRate,
          tenantId: req.user.tenantId
        }
      ],
      options
    );

    bed.status = 'Occupied';
    bed.currentAdmission = created._id;
    bed.currentPatient = patient._id;
    await bed.save(options);

    patient.patientType = 'IPD';
    patient.status = 'Active';
    patient.admissionDate = created.admittedAt;
    patient.dischargeDate = undefined;
    patient.roomNumber = bedLabel(bed.ward, bed);
    await patient.save(options);

    return created;
  });

  await admission.populate([
    { path: 'patient', select: 'firstName lastName patientId' },
    { path: 'ward', select: 'name code' },
    { path: 'bed', select: 'bedNumber' }
  ]);

  logActivity({
    user: req.user,
    action: 'PATIENT_ADMITTED',
    entityType: 'ADMISSION',
    entityId: admission._id,
    description: `Admitted ${patient.firstName} ${patient.lastName} to ${bedLabel(bed.ward, bed)} (${admission.admissionId})`
  });

  res.status(201).json({ success: true, message: 'Patient admitted', admission });
});

/** POST /api/admissions/:id/transfer - move an active stay to another bed. */
const transferPatient = asyncHandler(async (req, res) => {
  const { bedId, reason } = req.body;
  if (!bedId) throw ApiError.badRequest('Choose the bed to move the patient to');

  const admission = await Admission.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate('patient', 'firstName lastName patientId');

  if (!admission) throw ApiError.notFound('Admission not found');
  if (admission.status !== 'Active') throw ApiError.badRequest('This stay has already ended');
  if (String(admission.bed) === String(bedId)) {
    throw ApiError.badRequest('The patient is already in that bed');
  }

  const [fromBed, toBed] = await Promise.all([
    Bed.findOne({ _id: admission.bed, tenantId: req.user.tenantId }).populate('ward'),
    Bed.findOne({ _id: bedId, tenantId: req.user.tenantId }).populate('ward')
  ]);

  if (!toBed) throw ApiError.notFound('Destination bed not found');
  if (toBed.status !== 'Available') {
    throw ApiError.conflict(`That bed is ${toBed.status.toLowerCase()} - pick another one`);
  }

  await withTransaction(async (options) => {
    if (fromBed) {
      fromBed.status = 'Available';
      fromBed.currentAdmission = undefined;
      fromBed.currentPatient = undefined;
      await fromBed.save(options);
    }

    toBed.status = 'Occupied';
    toBed.currentAdmission = admission._id;
    toBed.currentPatient = admission.patient._id;
    await toBed.save(options);

    admission.transfers.push({
      fromBed: fromBed?._id,
      fromLabel: fromBed ? bedLabel(fromBed.ward, fromBed) : undefined,
      toBed: toBed._id,
      toLabel: bedLabel(toBed.ward, toBed),
      reason,
      movedBy: req.user.userId
    });
    admission.bed = toBed._id;
    admission.ward = toBed.ward._id;
    // The new ward may cost more or less; the stay is charged at the new rate
    // from here on.
    admission.dailyRate = toBed.dailyRate || toBed.ward?.dailyRate || admission.dailyRate;
    await admission.save(options);

    await Patient.updateOne(
      { _id: admission.patient._id, tenantId: req.user.tenantId },
      { $set: { roomNumber: bedLabel(toBed.ward, toBed) } },
      options
    );
  });

  logActivity({
    user: req.user,
    action: 'PATIENT_TRANSFERRED',
    entityType: 'ADMISSION',
    entityId: admission._id,
    description: `Moved ${admission.patient.firstName} ${admission.patient.lastName} to ${bedLabel(toBed.ward, toBed)}`
  });

  res.json({
    success: true,
    message: `Moved to ${bedLabel(toBed.ward, toBed)}`,
    admission
  });
});

/**
 * POST /api/admissions/:id/discharge
 * Frees the bed, closes the stay and - unless asked not to - raises the room
 * charge invoice for the nights stayed.
 */
const dischargePatient = asyncHandler(async (req, res) => {
  const { dischargeSummary, createInvoice } = req.body;

  const admission = await Admission.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  })
    .populate('patient', 'firstName lastName patientId')
    .populate('ward', 'name code');

  if (!admission) throw ApiError.notFound('Admission not found');
  if (admission.status !== 'Active') throw ApiError.badRequest('This stay has already ended');

  const nights = admission.lengthOfStayDays;
  const rate = admission.dailyRate || 0;

  const invoice = await withTransaction(async (options) => {
    await Bed.updateOne(
      { _id: admission.bed, tenantId: req.user.tenantId },
      { $set: { status: 'Available' }, $unset: { currentAdmission: '', currentPatient: '' } },
      options
    );

    admission.status = 'Discharged';
    admission.dischargedAt = new Date();
    admission.dischargedBy = req.user.userId;
    if (dischargeSummary) admission.dischargeSummary = dischargeSummary;
    await admission.save(options);

    await Patient.updateOne(
      { _id: admission.patient._id, tenantId: req.user.tenantId },
      {
        $set: { status: 'Discharged', dischargeDate: admission.dischargedAt },
        $unset: { roomNumber: '' }
      },
      options
    );

    if (createInvoice === false || rate <= 0) return null;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const [created] = await Billing.create(
      [
        {
          patientId: admission.patient._id,
          dueDate,
          items: [
            {
              itemName: `${admission.ward?.name || 'Ward'} stay (${nights} night${nights === 1 ? '' : 's'})`,
              itemType: 'Room',
              quantity: nights,
              unitPrice: rate
            }
          ],
          taxPercentage: 5,
          createdBy: req.user.userId,
          notes: `Room charges for admission ${admission.admissionId}`,
          tenantId: req.user.tenantId
        }
      ],
      options
    );
    return created;
  });

  logActivity({
    user: req.user,
    action: 'PATIENT_DISCHARGED',
    entityType: 'ADMISSION',
    entityId: admission._id,
    description: `Discharged ${admission.patient.firstName} ${admission.patient.lastName} after ${nights} night(s)`
  });

  res.json({
    success: true,
    message: invoice
      ? `Discharged after ${nights} night(s). Invoice ${invoice.invoiceId} raised for room charges.`
      : `Discharged after ${nights} night(s).`,
    admission,
    invoice
  });
});

/** GET /api/admissions/:id */
const getAdmission = asyncHandler(async (req, res) => {
  const admission = await Admission.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
    .populate('patient', 'firstName lastName patientId phone gender dateOfBirth allergies')
    .populate('ward', 'name code type department')
    .populate('bed', 'bedNumber')
    .populate('attendingDoctor', 'firstName lastName department')
    .populate('admittedBy dischargedBy', 'firstName lastName');

  if (!admission) throw ApiError.notFound('Admission not found');

  res.json({ success: true, admission });
});

module.exports = {
  listWards,
  getWard,
  createWard,
  updateWard,
  deleteWard,
  addBed,
  updateBed,
  deleteBed,
  availableBeds,
  listAdmissions,
  getAdmission,
  admitPatient,
  transferPatient,
  dischargePatient
};
