const express = require('express');
const { registerHospital, verifyHospital, getAllHospitals } = require('../controllers/hospitalController');

const router = express.Router();

router.post('/register', registerHospital);
router.get('/verify/:token', verifyHospital);
router.get('/all', getAllHospitals); // Super admin ke liye

module.exports = router; 