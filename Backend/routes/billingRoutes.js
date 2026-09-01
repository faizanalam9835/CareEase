const express = require('express');
const {
  createInvoice,
  createInvoiceFromAppointment,
  getAllInvoices,
  getInvoiceById,
  getInvoicesByPatient,
  updateInvoice,
  recordPayment,
  cancelInvoice,
  getFinancialDashboard
} = require('../controllers/billingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

const BILLING_STAFF = ['HOSPITAL_ADMIN', 'RECEPTIONIST'];
const BILLING_VIEWERS = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST'];

router.get('/dashboard', authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST'), getFinancialDashboard);

router.get('/invoices', authorizeRoles(...BILLING_VIEWERS), getAllInvoices);
router.get('/invoices/:id', authorizeRoles(...BILLING_VIEWERS), getInvoiceById);
router.get('/patients/:patientId/invoices', authorizeRoles(...BILLING_VIEWERS), getInvoicesByPatient);

router.post('/invoices', authorizeRoles(...BILLING_STAFF), createInvoice);
router.post(
  '/invoices/from-appointment/:appointmentId',
  authorizeRoles(...BILLING_STAFF),
  createInvoiceFromAppointment
);
router.post('/invoices/:id/payments', authorizeRoles(...BILLING_STAFF), recordPayment);
router.post('/invoices/:id/cancel', authorizeRoles('HOSPITAL_ADMIN'), cancelInvoice);

router.put('/invoices/:id', authorizeRoles(...BILLING_STAFF), updateInvoice);
// Kept for the previous client, which called PUT .../payment to settle an invoice.
router.put('/invoices/:id/payment', authorizeRoles(...BILLING_STAFF), recordPayment);

module.exports = router;
