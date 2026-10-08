import type { Department, Role } from '../config/constants';
import type { PatientDoc } from '../models/Patient';
import type { UserDoc } from '../models/User';

/** The caller's identity, as `authenticateToken` builds it from the live user record. */
export interface AuthUser {
  userId: string;
  tenantId: string;
  roles: Role[];
  department: Department;
  email: string;
  firstName: string;
  lastName: string;
}

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by `authenticateToken`. Declared non-optional because every
       * controller that reads it sits behind that middleware; on a public
       * route it is undefined at runtime, so check it there.
       */
      user: AuthUser;
      /** The hydrated User document behind `req.user`. Same caveat as `user`. */
      userDoc: UserDoc;
      /** Tenant from the verified token. Same caveat as `user`. */
      tenantId: string;
      /** Upper-cased tenant hint from `x-tenant-id` / `body.tenantId`, set by `tenantContext` on any route. */
      tenantHint?: string;
      /** Parsed query from `validate(schema, 'query')`; `req.query` itself is read-only in Express 5. */
      validatedQuery?: unknown;
      /** Set by `patientDepartmentAccess` - only for clinical staff, cross-department roles skip the lookup. */
      patient?: PatientDoc;
    }
  }
}
