const express = require('express');
const {
  createInvoice,
  getInvoiceById,
  getInvoicesByPatient,
  updatePaymentStatus,
  getFinancialDashboard
} = require('../controllers/billingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Create invoice
router.post('/invoices',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST'),
  createInvoice
);

// Get invoice by ID
router.get('/invoices/:id',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  getInvoiceById
);

// Get invoices by patient ID
router.get('/patients/:patientId/invoices',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  getInvoicesByPatient
);

// Update payment status
router.put('/invoices/:id/payment',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST'),
  updatePaymentStatus
);

// Get financial dashboard
router.get('/dashboard',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN'),
  getFinancialDashboard
);

module.exports = router;