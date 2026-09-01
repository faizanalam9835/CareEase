const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Billing = require('../models/Billing');
const Medicine = require('../models/Medicine');
const Admission = require('../models/Admission');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/apiError');

const round = (value) => Number((value || 0).toFixed(2));

/** Parses the from/to query into a concrete range, defaulting to this month. */
const resolveRange = (query) => {
  const now = new Date();

  const to = query.to ? new Date(query.to) : now;
  const from = query.from
    ? new Date(query.from)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw ApiError.badRequest('The date range is not valid');
  }

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  if (from > to) throw ApiError.badRequest('The start date must come before the end date');

  const days = Math.ceil((to - from) / 86400000);
  if (days > 400) throw ApiError.badRequest('Reports cover at most about a year at a time');

  return { from, to, days: Math.max(days, 1) };
};

/**
 * GET /api/reports?from=&to=
 *
 * One payload covering revenue, patient intake, clinical activity and pharmacy
 * movement over a chosen window. The frontend renders it and exports it to CSV
 * from the same numbers, so the screen and the export can never disagree.
 */
const getReport = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { from, to, days } = resolveRange(req.query);

  // The equivalent window immediately before this one, for a like-for-like
  // comparison rather than an arbitrary "last month".
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));

  const inRange = { $gte: from, $lte: to };

  const [
    revenue,
    previousRevenue,
    revenueByDay,
    revenueByCategory,
    paymentMethods,
    newPatients,
    previousPatients,
    patientsByDepartment,
    patientsByType,
    appointments,
    appointmentsByStatus,
    doctorWorkload,
    prescriptionCount,
    dispensedCount,
    topMedicines,
    admissionStats,
    outstanding
  ] = await Promise.all([
    Billing.aggregate([
      { $match: { tenantId, status: 'Active', invoiceDate: inRange } },
      {
        $group: {
          _id: null,
          invoiced: { $sum: '$totalAmount' },
          collected: { $sum: '$paidAmount' },
          outstanding: { $sum: '$balanceAmount' },
          discount: { $sum: '$discount' },
          tax: { $sum: '$taxAmount' },
          invoices: { $sum: 1 }
        }
      }
    ]),

    Billing.aggregate([
      { $match: { tenantId, status: 'Active', invoiceDate: { $gte: previousFrom, $lte: previousTo } } },
      { $group: { _id: null, collected: { $sum: '$paidAmount' }, invoices: { $sum: 1 } } }
    ]),

    Billing.aggregate([
      { $match: { tenantId, status: 'Active', invoiceDate: inRange } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' } },
          invoiced: { $sum: '$totalAmount' },
          collected: { $sum: '$paidAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    Billing.aggregate([
      { $match: { tenantId, status: 'Active', invoiceDate: inRange } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemType',
          amount: { $sum: '$items.amount' },
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { amount: -1 } }
    ]),

    Billing.aggregate([
      { $match: { tenantId, status: 'Active', invoiceDate: inRange } },
      { $unwind: '$payments' },
      { $group: { _id: '$payments.method', amount: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } }
    ]),

    Patient.countDocuments({ tenantId, createdAt: inRange }),
    Patient.countDocuments({ tenantId, createdAt: { $gte: previousFrom, $lte: previousTo } }),

    Patient.aggregate([
      { $match: { tenantId, createdAt: inRange } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),

    Patient.aggregate([
      { $match: { tenantId, createdAt: inRange } },
      { $group: { _id: '$patientType', count: { $sum: 1 } } }
    ]),

    Appointment.countDocuments({ tenantId, appointmentDate: inRange }),

    Appointment.aggregate([
      { $match: { tenantId, appointmentDate: inRange } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),

    Appointment.aggregate([
      { $match: { tenantId, appointmentDate: inRange } },
      {
        $group: {
          _id: '$doctorId',
          appointments: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } }
        }
      },
      { $sort: { appointments: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'doctor' } },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          appointments: 1,
          completed: 1,
          cancelled: 1,
          name: { $concat: ['$doctor.firstName', ' ', '$doctor.lastName'] },
          department: '$doctor.department'
        }
      }
    ]),

    Prescription.countDocuments({ tenantId, createdAt: inRange }),
    Prescription.countDocuments({ tenantId, dispensedAt: inRange }),

    Prescription.aggregate([
      { $match: { tenantId, createdAt: inRange } },
      { $unwind: '$medicines' },
      {
        $group: {
          _id: '$medicines.medicineName',
          prescribed: { $sum: '$medicines.quantity' },
          dispensed: { $sum: '$medicines.quantityDispensed' },
          times: { $sum: 1 }
        }
      },
      { $sort: { prescribed: -1 } },
      { $limit: 10 }
    ]),

    Admission.aggregate([
      { $match: { tenantId, admittedAt: inRange } },
      {
        $group: {
          _id: null,
          admissions: { $sum: 1 },
          discharged: { $sum: { $cond: [{ $eq: ['$status', 'Discharged'] }, 1, 0] } }
        }
      }
    ]),

    Billing.aggregate([
      { $match: { tenantId, status: 'Active', balanceAmount: { $gt: 0 } } },
      { $group: { _id: null, amount: { $sum: '$balanceAmount' }, invoices: { $sum: 1 } } }
    ])
  ]);

  // Average length of stay is computed here rather than in the pipeline because
  // an open stay has no discharge date to subtract from.
  const closedStays = await Admission.find({
    tenantId,
    status: 'Discharged',
    dischargedAt: inRange
  }).select('admittedAt dischargedAt');

  const averageStay = closedStays.length
    ? Number(
        (
          closedStays.reduce(
            (sum, stay) =>
              sum + Math.max(Math.ceil((stay.dischargedAt - stay.admittedAt) / 86400000), 1),
            0
          ) / closedStays.length
        ).toFixed(1)
      )
    : 0;

  const money = revenue[0] || { invoiced: 0, collected: 0, outstanding: 0, discount: 0, tax: 0, invoices: 0 };
  const previousMoney = previousRevenue[0] || { collected: 0, invoices: 0 };

  const change = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };

  const stockValue = await Medicine.aggregate([
    { $match: { tenantId } },
    { $group: { _id: null, value: { $sum: { $multiply: ['$stockQuantity', '$unitPrice'] } } } }
  ]);

  const activeStaff = await User.countDocuments({ tenantId, status: 'ACTIVE' });

  res.json({
    success: true,
    range: {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      days,
      comparedWith: {
        from: previousFrom.toISOString().split('T')[0],
        to: previousTo.toISOString().split('T')[0]
      }
    },
    summary: {
      revenueCollected: round(money.collected),
      revenueInvoiced: round(money.invoiced),
      revenueChange: change(money.collected, previousMoney.collected),
      invoices: money.invoices,
      invoicesChange: change(money.invoices, previousMoney.invoices),
      collectionRate: money.invoiced ? Number(((money.collected / money.invoiced) * 100).toFixed(1)) : 0,
      discountGiven: round(money.discount),
      taxCollected: round(money.tax),
      outstandingTotal: round(outstanding[0]?.amount),
      outstandingInvoices: outstanding[0]?.invoices || 0,

      newPatients,
      newPatientsChange: change(newPatients, previousPatients),
      appointments,
      prescriptions: prescriptionCount,
      dispensed: dispensedCount,
      admissions: admissionStats[0]?.admissions || 0,
      discharges: admissionStats[0]?.discharged || 0,
      averageLengthOfStay: averageStay,

      activeStaff,
      pharmacyStockValue: round(stockValue[0]?.value)
    },
    revenueByDay: revenueByDay.map((entry) => ({
      date: entry._id,
      invoiced: round(entry.invoiced),
      collected: round(entry.collected)
    })),
    revenueByCategory: revenueByCategory.map((entry) => ({
      category: entry._id || 'Other',
      amount: round(entry.amount),
      quantity: entry.quantity
    })),
    paymentMethods: paymentMethods.map((entry) => ({
      method: entry._id || 'Unknown',
      amount: round(entry.amount),
      count: entry.count
    })),
    patientsByDepartment: patientsByDepartment.map((entry) => ({
      department: entry._id || 'Unassigned',
      count: entry.count
    })),
    patientsByType: patientsByType.map((entry) => ({ type: entry._id, count: entry.count })),
    appointmentsByStatus: appointmentsByStatus.map((entry) => ({
      status: entry._id,
      count: entry.count
    })),
    doctorWorkload: doctorWorkload
      .filter((entry) => entry.name)
      .map((entry) => ({
        name: entry.name,
        department: entry.department,
        appointments: entry.appointments,
        completed: entry.completed,
        cancelled: entry.cancelled,
        completionRate: entry.appointments
          ? Number(((entry.completed / entry.appointments) * 100).toFixed(1))
          : 0
      })),
    topMedicines: topMedicines.map((entry) => ({
      medicine: entry._id,
      prescribed: entry.prescribed,
      dispensed: entry.dispensed || 0,
      times: entry.times
    }))
  });
});

module.exports = { getReport };
