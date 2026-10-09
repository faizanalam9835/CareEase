import Hospital from '../models/Hospital';
import User from '../models/User';
import Patient from '../models/Patient';
import Appointment from '../models/Appointment';
import { ApiError, asyncHandler } from '../utils/apiError';
import { logActivity } from '../utils/activityLog';

/** GET /api/hospitals/me - profile of the signed-in user's own hospital. */
export const getMyHospital = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ tenantId: req.user.tenantId });
  if (!hospital) throw ApiError.notFound('Hospital profile not found');

  const [staffCount, patientCount, appointmentCount] = await Promise.all([
    User.countDocuments({ tenantId: req.user.tenantId }),
    Patient.countDocuments({ tenantId: req.user.tenantId }),
    Appointment.countDocuments({ tenantId: req.user.tenantId })
  ]);

  res.json({
    success: true,
    hospital,
    summary: { staffCount, patientCount, appointmentCount }
  });
});

/** PUT /api/hospitals/me - admin edits the hospital profile. */
export const updateMyHospital = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ tenantId: req.user.tenantId });
  if (!hospital) throw ApiError.notFound('Hospital profile not found');

  const editable = ['name', 'address', 'city', 'state', 'contactNumber', 'website', 'bedCapacity'];
  for (const field of editable) {
    if (req.body[field] !== undefined) hospital.set(field, req.body[field]);
  }
  await hospital.save();

  logActivity({
    user: req.user,
    action: 'HOSPITAL_UPDATED',
    entityType: 'HOSPITAL',
    entityId: hospital._id,
    description: `Hospital profile updated`
  });

  res.json({ success: true, message: 'Hospital profile updated', hospital });
});
