const ActivityLog = require('../models/ActivityLog');

/**
 * Records an audit entry. Deliberately fire-and-forget: an audit write must
 * never fail the operation it is describing.
 */
const logActivity = ({ user, action, entityType, entityId, description, metadata }) => {
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

module.exports = { logActivity };
