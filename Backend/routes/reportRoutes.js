const express = require('express');
const { getReport } = require('../controllers/reportController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST'), getReport);

module.exports = router;
