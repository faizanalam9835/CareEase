const mongoose = require('mongoose');

/**
 * Lightweight audit trail. Powers the "Recent activity" feed on the dashboard
 * and gives an admin a record of who changed what.
 */
const activityLogSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },

    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: String,
    actorRole: String,

    // e.g. "PATIENT_CREATED", "INVOICE_PAID"
    action: { type: String, required: true },
    entityType: {
      type: String,
      enum: [
        'USER', 'PATIENT', 'APPOINTMENT', 'PRESCRIPTION', 'MEDICINE',
        'INVOICE', 'HOSPITAL', 'AUTH', 'WARD', 'BED', 'ADMISSION', 'VITALS'
      ]
    },
    entityId: String,
    description: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

activityLogSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
