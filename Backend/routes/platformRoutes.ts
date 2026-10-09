import express from 'express';
import {
  listTenants,
  createTenant,
  setTenantStatus,
  mailCheck,
  createTenantSchema,
  tenantStatusSchema,
  mailCheckSchema
} from '../controllers/platformController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = express.Router();

// The platform admin: CareEase staff only.
router.use(authenticateToken, authorizeRoles('SUPER_ADMIN'));

router.route('/tenants').get(listTenants).post(validate(createTenantSchema), createTenant);
router.patch('/tenants/:tenantId/status', validate(tenantStatusSchema), setTenantStatus);
router.post('/mail-check', validate(mailCheckSchema), mailCheck);

export default router;
