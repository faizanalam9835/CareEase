const express = require('express');
const {
  addMedicine,
  getAllMedicines,
  getMedicineById,
  getLowStockMedicines,
  getExpiringMedicines,
  updateMedicine,
  updateMedicineStock,
  deleteMedicine,
  dispensePrescription
} = require('../controllers/pharmacyController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Doctors and nurses need to see what is in stock before prescribing.
router.get('/medicines/low-stock', authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'), getLowStockMedicines);
router.get('/medicines/expiring', authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'), getExpiringMedicines);
router.get('/medicines', getAllMedicines);
router.get('/medicines/:id', getMedicineById);

router.post('/medicines', authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'), addMedicine);
router.put('/medicines/:id', authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'), updateMedicine);
router.put('/medicines/:id/stock', authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'), updateMedicineStock);
router.delete('/medicines/:id', authorizeRoles('HOSPITAL_ADMIN', 'PHARMACIST'), deleteMedicine);

router.post(
  '/prescriptions/:prescriptionId/dispense',
  authorizeRoles('PHARMACIST', 'HOSPITAL_ADMIN'),
  dispensePrescription
);

module.exports = router;
