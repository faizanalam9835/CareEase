const Billing = require('../models/Billing');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');

// Create New Invoice
const createInvoice = async (req, res) => {
  try {
    const {
      patientId,
      appointmentId,
      prescriptionId,
      items,
      discount,
      taxPercentage,
      paymentMethod,
      insuranceProvider,
      insuranceClaimAmount,
      notes
    } = req.body;

    // Validation
    if (!patientId || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Patient ID and at least one invoice item are required'
      });
    }

    // Check if patient exists and belongs to same tenant
    const patient = await Patient.findOne({
      _id: patientId,
      tenantId: req.user.tenantId
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }

    // Calculate amounts
    const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = taxPercentage ? (subTotal * taxPercentage) / 100 : 0;
    const totalAmount = subTotal + taxAmount - (discount || 0);

    // Set due date (7 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    // Create new invoice
    const newInvoice = new Billing({
      patientId,
      appointmentId: appointmentId || null,
      prescriptionId: prescriptionId || null,
      invoiceDate: new Date(),
      dueDate,
      items,
      subTotal,
      taxAmount: taxAmount || 0,
      discount: discount || 0,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      paymentMethod: paymentMethod || 'Cash',
      insuranceProvider: insuranceProvider || '',
      insuranceClaimAmount: insuranceClaimAmount || 0,
      notes: notes || '',
      tenantId: req.user.tenantId,
      status: 'Active'
    });

    await newInvoice.save();

    // Populate patient details
    await newInvoice.populate('patientId', 'firstName lastName patientId phone address');
    await newInvoice.populate('appointmentId', 'appointmentDate appointmentTime');
    await newInvoice.populate('prescriptionId', 'prescriptionId diagnosis');

    res.status(201).json({
      message: 'Invoice created successfully!',
      invoice: {
        id: newInvoice._id,
        invoiceId: newInvoice.invoiceId,
        patient: newInvoice.patientId,
        totalAmount: newInvoice.totalAmount,
        balanceAmount: newInvoice.balanceAmount,
        paymentStatus: newInvoice.paymentStatus,
        dueDate: newInvoice.dueDate
      }
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      error: 'Internal server error while creating invoice'
    });
  }
};

// Get Invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Billing.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    })
    .populate('patientId', 'firstName lastName patientId phone email address dateOfBirth gender')
    .populate('appointmentId', 'appointmentDate appointmentTime doctorId')
    .populate('prescriptionId', 'prescriptionId diagnosis medicines')
    .populate('appointmentId.doctorId', 'firstName lastName department');

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found'
      });
    }

    res.json({
      invoice
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Get Invoices by Patient ID
const getInvoicesByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { paymentStatus, page = 1, limit = 20 } = req.query;

    let filter = { 
      patientId, 
      tenantId: req.user.tenantId 
    };

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    const invoices = await Billing.find(filter)
      .populate('patientId', 'firstName lastName patientId phone')
      .sort({ invoiceDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Billing.countDocuments(filter);

    res.json({
      totalInvoices: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      invoices
    });

  } catch (error) {
    console.error('Get patient invoices error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Update Payment Status
const updatePaymentStatus = async (req, res) => {
  try {
    const { paidAmount, paymentMethod, paymentStatus, transactionId, notes } = req.body;

    const invoice = await Billing.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found'
      });
    }

    // Update payment details
    if (paidAmount !== undefined) {
      invoice.paidAmount = paidAmount;
      invoice.balanceAmount = invoice.totalAmount - paidAmount;
    }

    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (paymentStatus) invoice.paymentStatus = paymentStatus;
    if (transactionId) invoice.transactionId = transactionId;
    if (notes) invoice.notes = notes;

    // Set payment date if fully paid
    if (invoice.balanceAmount === 0) {
      invoice.paymentStatus = 'Paid';
      invoice.paymentDate = new Date();
    } else if (invoice.paidAmount > 0) {
      invoice.paymentStatus = 'Partially_Paid';
    }

    await invoice.save();

    res.json({
      message: 'Payment status updated successfully!',
      invoice: {
        id: invoice._id,
        invoiceId: invoice.invoiceId,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        paymentStatus: invoice.paymentStatus,
        paymentDate: invoice.paymentDate
      }
    });

  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      error: 'Internal server error during payment update'
    });
  }
};

// Get Financial Dashboard
const getFinancialDashboard = async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

    // Total revenue
    const totalRevenue = await Billing.aggregate([
      { $match: { tenantId: req.user.tenantId, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    // Monthly revenue
    const monthlyRevenue = await Billing.aggregate([
      { 
        $match: { 
          tenantId: req.user.tenantId, 
          paymentStatus: 'Paid',
          paymentDate: { $gte: firstDayOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    // Yearly revenue
    const yearlyRevenue = await Billing.aggregate([
      { 
        $match: { 
          tenantId: req.user.tenantId, 
          paymentStatus: 'Paid',
          paymentDate: { $gte: firstDayOfYear }
        } 
      },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    // Pending payments
    const pendingPayments = await Billing.aggregate([
      { 
        $match: { 
          tenantId: req.user.tenantId, 
          paymentStatus: { $in: ['Pending', 'Partially_Paid'] }
        } 
      },
      { $group: { _id: null, total: { $sum: '$balanceAmount' } } }
    ]);

    // Invoice counts by status
    const invoiceStats = await Billing.aggregate([
      { $match: { tenantId: req.user.tenantId } },
      { $group: { 
        _id: '$paymentStatus', 
        count: { $sum: 1 },
        amount: { $sum: '$totalAmount' }
      }}
    ]);

    res.json({
      dashboard: {
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        yearlyRevenue: yearlyRevenue[0]?.total || 0,
        pendingPayments: pendingPayments[0]?.total || 0,
        invoiceStats
      }
    });

  } catch (error) {
    console.error('Get financial dashboard error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = {
  createInvoice,
  getInvoiceById,
  getInvoicesByPatient,
  updatePaymentStatus,
  getFinancialDashboard
};