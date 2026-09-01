const Billing = require('../models/Billing');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { logActivity } = require('../utils/activityLog');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { PAYMENT_METHODS } = require('../config/constants');

const POPULATE = [
  { path: 'patientId', select: 'firstName lastName patientId phone email address dateOfBirth gender' },
  { path: 'appointmentId', select: 'appointmentId appointmentDate appointmentTime department' },
  { path: 'prescriptionId', select: 'prescriptionId diagnosis' },
  { path: 'createdBy', select: 'firstName lastName' }
];

/** POST /api/billing/invoices */
const createInvoice = asyncHandler(async (req, res) => {
  const { patientId, items, discount, taxPercentage, appointmentId, prescriptionId } = req.body;

  if (!patientId || !Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('A patient and at least one invoice line are required');
  }

  for (const [index, item] of items.entries()) {
    if (!item.itemName || item.unitPrice === undefined) {
      throw ApiError.badRequest(`Line ${index + 1} needs a description and a unit price`);
    }
    if (Number(item.unitPrice) < 0 || Number(item.quantity ?? 1) < 1) {
      throw ApiError.badRequest(`Line ${index + 1} has an invalid quantity or price`);
    }
  }

  const patient = await Patient.findOne({ _id: patientId, tenantId: req.user.tenantId });
  if (!patient) throw ApiError.notFound('Patient not found');

  const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date();
  if (!req.body.dueDate) dueDate.setDate(dueDate.getDate() + 7);

  const invoice = await Billing.create({
    patientId,
    appointmentId: appointmentId || undefined,
    prescriptionId: prescriptionId || undefined,
    invoiceDate: new Date(),
    dueDate,
    items: items.map((item) => ({
      itemName: item.itemName,
      itemType: item.itemType || 'Other',
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice
    })),
    // Totals are always recomputed by the model, never taken from the client.
    taxPercentage: taxPercentage ?? 0,
    discount: discount ?? 0,
    paymentMethod: req.body.paymentMethod || 'Cash',
    insuranceProvider: req.body.insuranceProvider || '',
    insuranceClaimAmount: req.body.insuranceClaimAmount || 0,
    notes: req.body.notes || '',
    createdBy: req.user.userId,
    tenantId: req.user.tenantId
  });

  await invoice.populate(POPULATE);

  logActivity({
    user: req.user,
    action: 'INVOICE_CREATED',
    entityType: 'INVOICE',
    entityId: invoice._id,
    description: `Raised invoice ${invoice.invoiceId} for ${patient.firstName} ${patient.lastName} (${invoice.totalAmount})`
  });

  res.status(201).json({ success: true, message: 'Invoice created', invoice });
});

/**
 * POST /api/billing/invoices/from-appointment/:appointmentId
 * One-click consultation invoice - the receptionist no longer has to retype the
 * doctor's fee for every visit.
 */
const createInvoiceFromAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOne({
    _id: req.params.appointmentId,
    tenantId: req.user.tenantId
  }).populate('doctorId', 'firstName lastName consultationFee department');

  if (!appointment) throw ApiError.notFound('Appointment not found');

  const existing = await Billing.findOne({
    appointmentId: appointment._id,
    tenantId: req.user.tenantId,
    status: 'Active'
  });
  if (existing) {
    throw ApiError.conflict(`Invoice ${existing.invoiceId} already covers this appointment`);
  }

  const fee = appointment.amount || appointment.doctorId?.consultationFee || 500;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const invoice = await Billing.create({
    patientId: appointment.patientId,
    appointmentId: appointment._id,
    dueDate,
    items: [
      {
        itemName: `${appointment.appointmentType} consultation - Dr. ${appointment.doctorId?.lastName || ''}`.trim(),
        itemType: 'Consultation',
        quantity: 1,
        unitPrice: fee
      }
    ],
    taxPercentage: req.body.taxPercentage ?? 0,
    createdBy: req.user.userId,
    notes: `Consultation on ${new Date(appointment.appointmentDate).toDateString()}`,
    tenantId: req.user.tenantId
  });

  await invoice.populate(POPULATE);
  res.status(201).json({ success: true, message: 'Consultation invoice created', invoice });
});

/** GET /api/billing/invoices */
const getAllInvoices = asyncHandler(async (req, res) => {
  const { paymentStatus, search, from, to, patientId } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = { tenantId: req.user.tenantId };
  if (paymentStatus && paymentStatus !== 'All') filter.paymentStatus = paymentStatus;
  if (patientId) filter.patientId = patientId;

  if (from || to) {
    filter.invoiceDate = {};
    if (from) filter.invoiceDate.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.invoiceDate.$lte = end;
    }
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    // Resolve patient names to ids first so the search covers them too.
    const patients = await Patient.find({
      tenantId: req.user.tenantId,
      $or: [{ firstName: pattern }, { lastName: pattern }, { patientId: pattern }]
    }).select('_id');

    filter.$or = [
      { invoiceId: pattern },
      ...(patients.length ? [{ patientId: { $in: patients.map((p) => p._id) } }] : [])
    ];
  }

  const [invoices, total, summary] = await Promise.all([
    Billing.find(filter).populate(POPULATE).sort({ invoiceDate: -1 }).skip(skip).limit(limit),
    Billing.countDocuments(filter),
    Billing.aggregate([
      { $match: { tenantId: req.user.tenantId, status: 'Active' } },
      {
        $group: {
          _id: null,
          invoiced: { $sum: '$totalAmount' },
          collected: { $sum: '$paidAmount' },
          outstanding: { $sum: '$balanceAmount' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const stats = summary[0] || { invoiced: 0, collected: 0, outstanding: 0, count: 0 };

  res.json({
    success: true,
    invoices,
    totalInvoices: total,
    currentPage: page,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    meta: buildMeta(total, page, limit),
    stats: {
      count: stats.count,
      invoiced: Number(stats.invoiced.toFixed(2)),
      collected: Number(stats.collected.toFixed(2)),
      outstanding: Number(stats.outstanding.toFixed(2))
    }
  });
});

/** GET /api/billing/invoices/:id */
const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Billing.findOne({
    _id: req.params.id,
    tenantId: req.user.tenantId
  }).populate(POPULATE);

  if (!invoice) throw ApiError.notFound('Invoice not found');
  res.json({ success: true, invoice });
});

/** GET /api/billing/patients/:patientId/invoices */
const getInvoicesByPatient = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { patientId: req.params.patientId, tenantId: req.user.tenantId };
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

  const [invoices, total] = await Promise.all([
    Billing.find(filter).populate(POPULATE).sort({ invoiceDate: -1 }).skip(skip).limit(limit),
    Billing.countDocuments(filter)
  ]);

  res.json({
    success: true,
    invoices,
    totalInvoices: total,
    meta: buildMeta(total, page, limit),
    outstanding: Number(
      invoices.reduce((sum, invoice) => sum + (invoice.balanceAmount || 0), 0).toFixed(2)
    )
  });
});

/** PUT /api/billing/invoices/:id */
const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Billing.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice.paidAmount > 0) {
    throw ApiError.badRequest('This invoice already has payments against it and can no longer be edited');
  }

  if (req.body.items) {
    invoice.items = req.body.items.map((item) => ({
      itemName: item.itemName,
      itemType: item.itemType || 'Other',
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice
    }));
  }
  for (const field of ['taxPercentage', 'discount', 'notes', 'dueDate', 'insuranceProvider']) {
    if (req.body[field] !== undefined) invoice[field] = req.body[field];
  }

  await invoice.save();
  await invoice.populate(POPULATE);

  res.json({ success: true, message: 'Invoice updated', invoice });
});

/**
 * POST /api/billing/invoices/:id/payments
 *
 * Records a payment as an entry in a ledger rather than overwriting
 * `paidAmount`. The old endpoint let a client set any paid amount it liked,
 * including one larger than the invoice, and derived the status inconsistently.
 */
const recordPayment = asyncHandler(async (req, res) => {
  const { amount, method, transactionId } = req.body;

  const invoice = await Billing.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice.status !== 'Active') throw ApiError.badRequest('This invoice is not active');

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw ApiError.badRequest('Enter a payment amount greater than zero');
  }
  if (value > invoice.balanceAmount + 0.005) {
    throw ApiError.badRequest(
      `That is more than the outstanding balance of ${invoice.balanceAmount.toFixed(2)}`
    );
  }
  if (method && !PAYMENT_METHODS.includes(method)) {
    throw ApiError.badRequest(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`);
  }

  invoice.payments.push({
    amount: value,
    method: method || 'Cash',
    transactionId,
    recordedBy: req.user.userId
  });
  if (method) invoice.paymentMethod = method;
  if (transactionId) invoice.transactionId = transactionId;

  await invoice.save(); // recalculate() runs in the pre-save hook
  await invoice.populate(POPULATE);

  // Keep the linked appointment's payment flag in step.
  if (invoice.appointmentId && invoice.paymentStatus === 'Paid') {
    await Appointment.updateOne(
      { _id: invoice.appointmentId, tenantId: req.user.tenantId },
      { $set: { paymentStatus: 'Paid' } }
    );
  }

  logActivity({
    user: req.user,
    action: 'PAYMENT_RECORDED',
    entityType: 'INVOICE',
    entityId: invoice._id,
    description: `Received ${value.toFixed(2)} against ${invoice.invoiceId}`
  });

  res.json({
    success: true,
    message:
      invoice.paymentStatus === 'Paid'
        ? 'Payment recorded, invoice settled in full'
        : `Payment recorded, ${invoice.balanceAmount.toFixed(2)} still outstanding`,
    invoice
  });
});

/** POST /api/billing/invoices/:id/cancel */
const cancelInvoice = asyncHandler(async (req, res) => {
  const invoice = await Billing.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice.paidAmount > 0) {
    throw ApiError.badRequest('This invoice has payments against it - issue a refund instead of cancelling');
  }

  invoice.status = 'Cancelled';
  invoice.notes = req.body.reason ? `Cancelled: ${req.body.reason}` : invoice.notes;
  await invoice.save();

  logActivity({
    user: req.user,
    action: 'INVOICE_CANCELLED',
    entityType: 'INVOICE',
    entityId: invoice._id,
    description: `Cancelled invoice ${invoice.invoiceId}`
  });

  res.json({ success: true, message: 'Invoice cancelled', invoice });
});

/** GET /api/billing/dashboard - revenue analytics for the finance view. */
const getFinancialDashboard = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [totals, monthly, yearly, byStatus, trend, byItemType, topDebtors] = await Promise.all([
    Billing.aggregate([
      { $match: { tenantId, status: 'Active' } },
      {
        $group: {
          _id: null,
          invoiced: { $sum: '$totalAmount' },
          collected: { $sum: '$paidAmount' },
          outstanding: { $sum: '$balanceAmount' }
        }
      }
    ]),
    Billing.aggregate([
      { $match: { tenantId, status: 'Active', invoiceDate: { $gte: startOfMonth } } },
      { $group: { _id: null, invoiced: { $sum: '$totalAmount' }, collected: { $sum: '$paidAmount' } } }
    ]),
    Billing.aggregate([
      { $match: { tenantId, status: 'Active', invoiceDate: { $gte: startOfYear } } },
      { $group: { _id: null, invoiced: { $sum: '$totalAmount' }, collected: { $sum: '$paidAmount' } } }
    ]),
    Billing.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }
    ]),
    Billing.aggregate([
      { $match: { tenantId, status: 'Active', invoiceDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' } },
          invoiced: { $sum: '$totalAmount' },
          collected: { $sum: '$paidAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    Billing.aggregate([
      { $match: { tenantId, status: 'Active' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.itemType', amount: { $sum: '$items.amount' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } }
    ]),
    Billing.aggregate([
      { $match: { tenantId, status: 'Active', balanceAmount: { $gt: 0 } } },
      { $group: { _id: '$patientId', outstanding: { $sum: '$balanceAmount' }, invoices: { $sum: 1 } } },
      { $sort: { outstanding: -1 } },
      { $limit: 5 },
      {
        $lookup: { from: 'patients', localField: '_id', foreignField: '_id', as: 'patient' }
      },
      { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          outstanding: 1,
          invoices: 1,
          name: { $concat: ['$patient.firstName', ' ', '$patient.lastName'] },
          patientCode: '$patient.patientId'
        }
      }
    ])
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const round = (value) => Number((value || 0).toFixed(2));

  res.json({
    success: true,
    dashboard: {
      totalInvoiced: round(totals[0]?.invoiced),
      totalRevenue: round(totals[0]?.collected),
      pendingPayments: round(totals[0]?.outstanding),
      monthlyRevenue: round(monthly[0]?.collected),
      monthlyInvoiced: round(monthly[0]?.invoiced),
      yearlyRevenue: round(yearly[0]?.collected),
      collectionRate: totals[0]?.invoiced
        ? Number(((totals[0].collected / totals[0].invoiced) * 100).toFixed(1))
        : 0,
      invoiceStats: byStatus.map((entry) => ({
        status: entry._id,
        count: entry.count,
        amount: round(entry.amount)
      })),
      revenueTrend: trend.map((entry) => ({
        label: `${monthNames[entry._id.month - 1]} ${String(entry._id.year).slice(2)}`,
        invoiced: round(entry.invoiced),
        collected: round(entry.collected),
        invoices: entry.count
      })),
      revenueByCategory: byItemType.map((entry) => ({
        category: entry._id,
        amount: round(entry.amount),
        count: entry.count
      })),
      topDebtors: topDebtors.map((entry) => ({
        name: entry.name || 'Unknown patient',
        patientCode: entry.patientCode,
        outstanding: round(entry.outstanding),
        invoices: entry.invoices
      }))
    }
  });
});

module.exports = {
  createInvoice,
  createInvoiceFromAppointment,
  getAllInvoices,
  getInvoiceById,
  getInvoicesByPatient,
  updateInvoice,
  recordPayment,
  cancelInvoice,
  getFinancialDashboard
};
