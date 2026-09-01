const express = require('express');
const { deleteVitals, needsAttention } = require('../controllers/vitalsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// The nurse worklist: abnormal or overdue observations.
router.get('/attention', needsAttention);
router.delete('/:id', deleteVitals);

module.exports = router;
