const express = require('express');
const {
  listWards,
  getWard,
  createWard,
  updateWard,
  deleteWard,
  addBed
} = require('../controllers/wardController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Anyone clinical needs to see where the beds are; only admins reshape the ward.
const WARD_MANAGERS = ['HOSPITAL_ADMIN'];

router.get('/', listWards);
router.get('/:id', getWard);

router.post('/', authorizeRoles(...WARD_MANAGERS), createWard);
router.put('/:id', authorizeRoles(...WARD_MANAGERS), updateWard);
router.delete('/:id', authorizeRoles(...WARD_MANAGERS), deleteWard);

router.post('/:id/beds', authorizeRoles(...WARD_MANAGERS), addBed);

module.exports = router;
