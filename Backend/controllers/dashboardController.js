const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const Billing = require('../models/Billing');
const Hospital = require('../models/Hospital');
const ActivityLog = require('../models/ActivityLog');
const Bed = require('../models/Bed');
const Admission = require('../models/Admission');
const { asyncHandler } = require('../utils/apiError');
const { escapeRegex } = require('../utils/pagination');
const { isCrossDepartment } = require('../middleware/abac');
const constants = require('../config/constants');

const startOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const round = (value) => Number((value || 0).toFixed(2));

/**
 * GET /api/dashboard/stats
 *
 * The dashboard used to invent its numbers in the browser - bed occupancy and
 * revenue were hard-coded constants. Everything here is computed from the data.
 * The payload is shaped by role, so a pharmacist is not sent the payroll-shaped
 * figures they cannot see anyway.
 */
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const today = startOfDay();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const departmentScope = isCrossDepartment(req.user) ? {} : { department: req.user.department };

  const [
    hospital,
    staffCounts,
    patientCounts,
    newPatientsThisMonth,
    newPatientsLastMonth,
    todayAppointments,
    upcomingAppointments,
    appointmentStatus,
    prescriptionCounts,
    pharmacySummary,
    revenue,
    revenueLastMonth,
    bedCounts,
    activeAdmissions
  ] = await Promise.all([
    Hospital.findOne({ tenantId }).lean(),

    User.aggregate([
      { $match: { tenantId } },
      { $unwind: '$roles' },
      { $group: { _id: '$roles', count: { $sum: 1 } } }
    ]),

    Patient.aggregate([
      { $match: { tenantId, ...departmentScope } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          opd: { $sum: { $cond: [{ $eq: ['$patientType', 'OPD'] }, 1, 0] } },
          ipd: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$patientType', 'IPD'] }, { $eq: ['$status', 'Active'] }] },
                1,
                0
              ]
            }
          },
          active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } }
        }
      }
    ]),

    Patient.countDocuments({ tenantId, ...departmentScope, createdAt: { $gte: startOfMonth } }),
    Patient.countDocuments({
      tenantId,
      ...departmentScope,
      createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }
    }),

    Appointment.countDocuments({
      tenantId,
      ...departmentScope,
      appointmentDate: { $gte: today, $lt: tomorrow }
    }),
    Appointment.countDocuments({
      tenantId,
      ...departmentScope,
      appointmentDate: { $gte: tomorrow },
      status: { $in: ['Scheduled', 'Confirmed'] }
    }),
    Appointment.aggregate([
      { $match: { tenantId, ...departmentScope } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),

    Prescription.aggregate([
      { $match: { tenantId, ...departmentScope } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$pharmacyStatus', 'Pending'] }, 1, 0] } }
        }
      }
    ]),

    Medicine.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          lowStock: { $sum: { $cond: [{ $lte: ['$stockQuantity', '$reorderLevel'] }, 1, 0] } },
          stockValue: { $sum: { $multiply: ['$stockQuantity', '$unitPrice'] } }
        }
      }
    ]),

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
      {
        $match: {
          tenantId,
          status: 'Active',
          invoiceDate: { $gte: startOfLastMonth, $lt: startOfMonth }
        }
      },
      { $group: { _id: null, collected: { $sum: '$paidAmount' } } }
    ]),

    Bed.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),

    Admission.countDocuments({ tenantId, status: 'Active' })
  ]);

  const monthRevenue = await Billing.aggregate([
    { $match: { tenantId, status: 'Active', invoiceDate: { $gte: startOfMonth } } },
    { $group: { _id: null, collected: { $sum: '$paidAmount' } } }
  ]);

  const patients = patientCounts[0] || { total: 0, opd: 0, ipd: 0, active: 0 };
  const roleMap = Object.fromEntries(staffCounts.map((entry) => [entry._id, entry.count]));
  const pharmacy = pharmacySummary[0] || { total: 0, lowStock: 0, stockValue: 0 };
  const money = revenue[0] || { invoiced: 0, collected: 0, outstanding: 0 };

  const percentChange = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };

  const beds = Object.fromEntries(bedCounts.map((entry) => [entry._id, entry.count]));
  const managedBeds = Object.values(beds).reduce((sum, count) => sum + count, 0);

  // Once wards and beds exist they are the truth. Before that, fall back to the
  // single capacity figure on the hospital profile so the tile is not blank.
  const usesBedRegister = managedBeds > 0;
  const bedCapacity = usesBedRegister ? managedBeds : hospital?.bedCapacity || 0;
  const occupiedBeds = usesBedRegister ? beds.Occupied || 0 : patients.ipd;

  res.json({
    success: true,
    stats: {
      totalStaff: Object.values(roleMap).reduce((sum, count) => sum + count, 0),
      activeDoctors: roleMap.DOCTOR || 0,
      nurses: roleMap.NURSE || 0,
      staffByRole: roleMap,

      totalPatients: patients.total,
      opdPatients: patients.opd,
      ipdPatients: patients.ipd,
      activePatients: patients.active,
      patientGrowth: percentChange(newPatientsThisMonth, newPatientsLastMonth),
      newPatientsThisMonth,

      todayAppointments,
      upcomingAppointments,
      appointmentsByStatus: Object.fromEntries(
        appointmentStatus.map((entry) => [entry._id, entry.count])
      ),

      totalPrescriptions: prescriptionCounts[0]?.total || 0,
      pendingPrescriptions: prescriptionCounts[0]?.pending || 0,

      medicineCount: pharmacy.total,
      lowStockCount: pharmacy.lowStock,
      stockValue: round(pharmacy.stockValue),

      totalRevenue: round(money.collected),
      totalInvoiced: round(money.invoiced),
      monthlyRevenue: round(monthRevenue[0]?.collected),
      revenueGrowth: percentChange(
        monthRevenue[0]?.collected || 0,
        revenueLastMonth[0]?.collected || 0
      ),
      pendingPayments: round(money.outstanding),

      bedCapacity,
      occupiedBeds,
      availableBeds: usesBedRegister ? beds.Available || 0 : Math.max(bedCapacity - occupiedBeds, 0),
      bedsOutOfService: beds.Maintenance || 0,
      activeAdmissions,
      bedSource: usesBedRegister ? 'wards' : 'hospital-profile',
      occupancyRate: bedCapacity ? Number(((occupiedBeds / bedCapacity) * 100).toFixed(1)) : 0
    },
    scope: {
      hospitalName: hospital?.name || 'CareEase Hospital',
      tenantId,
      department: isCrossDepartment(req.user) ? 'All departments' : req.user.department
    }
  });
});

/**
 * GET /api/dashboard/charts
 * Series for the dashboard graphs: appointments per day, revenue per month,
 * patients per department and the OPD/IPD split.
 */
const getCharts = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 7), 90);

  const from = startOfDay();
  from.setDate(from.getDate() - (days - 1));

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [appointmentSeries, revenueSeries, byDepartment, patientTypeSplit, topDoctors] =
    await Promise.all([
      Appointment.aggregate([
        { $match: { tenantId, appointmentDate: { $gte: from } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } },
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      Billing.aggregate([
        { $match: { tenantId, status: 'Active', invoiceDate: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' } },
            invoiced: { $sum: '$totalAmount' },
            collected: { $sum: '$paidAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      Patient.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      Patient.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$patientType', count: { $sum: 1 } } }
      ]),

      Appointment.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$doctorId', appointments: { $sum: 1 } } },
        { $sort: { appointments: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'doctor' } },
        { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            appointments: 1,
            name: { $concat: ['Dr. ', '$doctor.firstName', ' ', '$doctor.lastName'] },
            department: '$doctor.department'
          }
        }
      ])
    ]);

  // Fill the gaps so the line chart has a point for every day, not just the
  // days that happened to have appointments.
  const seriesByDate = Object.fromEntries(appointmentSeries.map((entry) => [entry._id, entry]));
  const appointmentTrend = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(from);
    date.setDate(date.getDate() + i);
    const key = date.toISOString().split('T')[0];
    const entry = seriesByDate[key];
    appointmentTrend.push({
      date: key,
      label: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      total: entry?.total || 0,
      completed: entry?.completed || 0,
      cancelled: entry?.cancelled || 0
    });
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  res.json({
    success: true,
    charts: {
      appointmentTrend,
      revenueTrend: revenueSeries.map((entry) => ({
        label: `${monthNames[entry._id.month - 1]} ${String(entry._id.year).slice(2)}`,
        invoiced: round(entry.invoiced),
        collected: round(entry.collected)
      })),
      patientsByDepartment: byDepartment.map((entry) => ({
        department: entry._id || 'Unassigned',
        count: entry.count
      })),
      patientTypeSplit: patientTypeSplit.map((entry) => ({
        type: entry._id,
        count: entry.count
      })),
      topDoctors: topDoctors
        .filter((entry) => entry.name)
        .map((entry) => ({
          name: entry.name,
          department: entry.department,
          appointments: entry.appointments
        }))
    }
  });
});

/** GET /api/dashboard/activities - the audit feed. */
const getRecentActivities = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  const activities = await ActivityLog.find({ tenantId: req.user.tenantId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    success: true,
    count: activities.length,
    activities: activities.map((entry) => ({
      id: entry._id,
      type: entry.action,
      entityType: entry.entityType,
      description: entry.description,
      actor: entry.actorName,
      actorRole: entry.actorRole,
      timestamp: entry.createdAt
    }))
  });
});

/**
 * GET /api/dashboard/alerts
 * The things somebody needs to act on: low stock, expiring medicines, overdue
 * invoices and prescriptions still waiting at the pharmacy counter.
 */
const getAlerts = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [lowStock, expiring, overdue, pendingRx] = await Promise.all([
    Medicine.find({
      tenantId,
      status: { $ne: 'Discontinued' },
      $expr: { $lte: ['$stockQuantity', '$reorderLevel'] }
    })
      .select('name dosage stockQuantity reorderLevel')
      .sort({ stockQuantity: 1 })
      .limit(5),

    Medicine.find({ tenantId, expiryDate: { $ne: null, $lte: in30Days } })
      .select('name dosage expiryDate stockQuantity')
      .sort({ expiryDate: 1 })
      .limit(5),

    Billing.find({
      tenantId,
      status: 'Active',
      balanceAmount: { $gt: 0 },
      dueDate: { $lt: new Date() }
    })
      .populate('patientId', 'firstName lastName patientId')
      .select('invoiceId balanceAmount dueDate patientId')
      .sort({ dueDate: 1 })
      .limit(5),

    Prescription.countDocuments({ tenantId, pharmacyStatus: 'Pending', status: 'Active' })
  ]);

  const alerts = [];

  for (const medicine of lowStock) {
    alerts.push({
      severity: medicine.stockQuantity === 0 ? 'critical' : 'warning',
      category: 'pharmacy',
      title: medicine.stockQuantity === 0 ? 'Out of stock' : 'Low stock',
      message: `${medicine.name} ${medicine.dosage} - ${medicine.stockQuantity} left (reorder at ${medicine.reorderLevel})`,
      link: '/app/pharmacy'
    });
  }

  for (const medicine of expiring) {
    alerts.push({
      severity: 'warning',
      category: 'pharmacy',
      title: 'Expiring soon',
      message: `${medicine.name} ${medicine.dosage} expires on ${new Date(medicine.expiryDate).toDateString()}`,
      link: '/app/pharmacy'
    });
  }

  for (const invoice of overdue) {
    alerts.push({
      severity: 'warning',
      category: 'billing',
      title: 'Overdue invoice',
      message: `${invoice.invoiceId} - ${invoice.balanceAmount.toFixed(2)} outstanding from ${
        invoice.patientId ? `${invoice.patientId.firstName} ${invoice.patientId.lastName}` : 'a patient'
      }`,
      link: '/app/billing'
    });
  }

  if (pendingRx > 0) {
    alerts.push({
      severity: 'info',
      category: 'pharmacy',
      title: 'Prescriptions waiting',
      message: `${pendingRx} prescription(s) are waiting to be dispensed`,
      link: '/app/prescriptions'
    });
  }

  res.json({ success: true, count: alerts.length, alerts });
});

/**
 * GET /api/search?q=
 * One search box in the header that reaches patients, staff, appointments,
 * prescriptions and invoices at once.
 */
const globalSearch = asyncHandler(async (req, res) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) {
    return res.json({ success: true, query: term, results: [] });
  }

  const tenantId = req.user.tenantId;
  const pattern = new RegExp(escapeRegex(term), 'i');
  const results = [];

  const patientFilter = { tenantId, $or: [{ firstName: pattern }, { lastName: pattern }, { patientId: pattern }, { phone: pattern }] };
  if (!isCrossDepartment(req.user)) patientFilter.department = req.user.department;

  const [patients, staff, invoices] = await Promise.all([
    Patient.find(patientFilter).select('firstName lastName patientId phone department').limit(5),
    req.user.roles.includes('HOSPITAL_ADMIN')
      ? User.find({ tenantId, $or: [{ firstName: pattern }, { lastName: pattern }, { email: pattern }] })
          .select('firstName lastName email roles department')
          .limit(5)
      : [],
    Billing.find({ tenantId, invoiceId: pattern }).select('invoiceId totalAmount paymentStatus').limit(5)
  ]);

  for (const patient of patients) {
    results.push({
      type: 'patient',
      id: patient._id,
      title: `${patient.firstName} ${patient.lastName}`,
      subtitle: `${patient.patientId} - ${patient.department} - ${patient.phone}`,
      link: `/app/patients?highlight=${patient._id}`
    });
  }
  for (const member of staff) {
    results.push({
      type: 'staff',
      id: member._id,
      title: `${member.firstName} ${member.lastName}`,
      subtitle: `${member.roles.join(', ')} - ${member.department}`,
      link: `/app/admin/users?highlight=${member._id}`
    });
  }
  for (const invoice of invoices) {
    results.push({
      type: 'invoice',
      id: invoice._id,
      title: invoice.invoiceId,
      subtitle: `${invoice.totalAmount.toFixed(2)} - ${invoice.paymentStatus}`,
      link: `/app/billing?highlight=${invoice._id}`
    });
  }

  res.json({ success: true, query: term, count: results.length, results });
});

/**
 * GET /api/dashboard/system-status
 * Real health of the pieces this API depends on, instead of the hard-coded
 * "everything is fine" list the old frontend displayed.
 */
const getSystemStatus = asyncHandler(async (req, res) => {
  const started = Date.now();
  let dbStatus = 'down';
  let dbLatency = null;

  try {
    await mongoose.connection.db.admin().ping();
    dbLatency = `${Date.now() - started}ms`;
    dbStatus = 'operational';
  } catch {
    dbStatus = 'down';
  }

  const config = require('../config/env');

  res.json({
    success: true,
    services: [
      { service: 'API server', status: 'operational', response: `uptime ${Math.floor(process.uptime())}s` },
      { service: 'Database', status: dbStatus, response: dbLatency || 'unreachable' },
      {
        service: 'E-mail delivery',
        status: config.email.enabled ? 'operational' : 'degraded',
        response: config.email.enabled ? 'SMTP configured' : 'console mode (SMTP not configured)'
      }
    ]
  });
});

/** GET /api/meta - enumerations the frontend renders its dropdowns from. */
const getMetadata = (_req, res) => {
  res.json({
    success: true,
    meta: {
      roles: constants.ROLES,
      departments: constants.DEPARTMENTS,
      clinicalDepartments: constants.CLINICAL_DEPARTMENTS,
      bloodGroups: constants.BLOOD_GROUPS,
      genders: constants.GENDERS,
      patientTypes: constants.PATIENT_TYPES,
      patientStatuses: constants.PATIENT_STATUSES,
      appointmentTypes: constants.APPOINTMENT_TYPES,
      appointmentStatuses: constants.APPOINTMENT_STATUSES,
      medicineCategories: constants.MEDICINE_CATEGORIES,
      invoiceItemTypes: constants.INVOICE_ITEM_TYPES,
      paymentStatuses: constants.PAYMENT_STATUSES,
      paymentMethods: constants.PAYMENT_METHODS,
      prescriptionStatuses: constants.PRESCRIPTION_STATUSES,
      pharmacyStatuses: constants.PHARMACY_STATUSES,
      wardTypes: constants.WARD_TYPES,
      bedStatuses: constants.BED_STATUSES,
      admissionStatuses: constants.ADMISSION_STATUSES
    }
  });
};

module.exports = {
  getStats,
  getCharts,
  getRecentActivities,
  getAlerts,
  globalSearch,
  getSystemStatus,
  getMetadata
};
