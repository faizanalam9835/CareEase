const express = require('express');
const {
  addMedicine,
  getAllMedicines,
  updateMedicineStock,
  getLowStockMedicines,
  dispensePrescription
} = require('../controllers/pharmacyController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Add medicine (Pharmacist & Admin only)
router.post('/medicines',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'),
  addMedicine
);

// Get all medicines
router.get('/medicines',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST', 'DOCTOR'),
  getAllMedicines
);

// Get low stock medicines
router.get('/medicines/low-stock',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'),
  getLowStockMedicines
);

// Update medicine stock
router.put('/medicines/:id/stock',
  authenticateToken,
  authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'),
  updateMedicineStock
);

// Dispense prescription
router.post('/prescriptions/:prescriptionId/dispense',
  authenticateToken,
  authorizeRoles('PHARMACIST'),
  dispensePrescription
);

module.exports = router;