import express from 'express';
import {
  createAppointment,
  getAllAppointments,
  getTodaysAppointments,
  getAppointmentsByPatient,
  getAppointmentsByDoctor,
  getDoctorAvailability,
  updateAppointmentStatus,
  updateAppointment,
  deleteAppointment
} from '../controllers/appointmentController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Fixed paths first, so `/today` is not swallowed by a `/:id` route.
router.get('/today', getTodaysAppointments);
router.get('/availability', getDoctorAvailability);
router.get('/patient/:patientId', getAppointmentsByPatient);
router.get('/doctor/:doctorId', getAppointmentsByDoctor);

// Doctors and nurses may read the diary; the controller narrows the result to
// their own patients.
router.get('/', getAllAppointments);

router.post(
  '/',
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'),
  createAppointment
);

router.patch(
  '/:id/status',
  authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  updateAppointmentStatus
);
// PUT alias so an older client calling PUT on the status route still works.
router.put('/:id/status', authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'), updateAppointmentStatus);

router.put('/:id', authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR'), updateAppointment);
router.delete('/:id', authorizeRoles('HOSPITAL_ADMIN', 'RECEPTIONIST'), deleteAppointment);

export default router;
