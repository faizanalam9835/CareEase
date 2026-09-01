const express = require('express');
const { availableBeds, updateBed, deleteBed } = require('../controllers/wardController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Fixed path first, so `/available` is not captured by `/:id`.
router.get('/available', availableBeds);

router.put('/:id', authorizeRoles('HOSPITAL_ADMIN', 'NURSE'), updateBed);
router.delete('/:id', authorizeRoles('HOSPITAL_ADMIN'), deleteBed);

module.exports = router;
