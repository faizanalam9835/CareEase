import type { Types } from 'mongoose';
import ActivityLog, { type ActivityEntityType } from '../models/ActivityLog';

/** Who did it. `req.user` fits; so does an ad-hoc object built at login. */
export interface ActivityActor {
  userId?: Types.ObjectId | string;
  tenantId?: string;
  roles?: readonly string[];
  firstName?: string;
  lastName?: string;
}

export interface ActivityEntry {
  user?: ActivityActor | null;
  action: string;
  entityType?: ActivityEntityType;
  entityId?: Types.ObjectId | string | null;
  description: string;
  metadata?: unknown;
}

/**
 * Records an audit entry. Deliberately fire-and-forget: an audit write must
 * never fail the operation it is describing.
 */
const logActivity = ({ user, action, entityType, entityId, description, metadata }: ActivityEntry): void => {
  const entry = {
    tenantId: user?.tenantId,
    actorId: user?.userId,
    actorName: user ? `${user.firstName} ${user.lastName}`.trim() : 'System',
    actorRole: user?.roles?.[0],
    action,
    entityType,
    entityId: entityId ? String(entityId) : undefined,
    description,
    metadata
  };

  if (!entry.tenantId) return;

  ActivityLog.create(entry).catch((error) =>
    console.error('[activity] could not record entry:', error.message)
  );
};

export { logActivity };
