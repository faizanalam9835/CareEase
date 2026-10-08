import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';

const ACTIVITY_ENTITY_TYPES = [
  'USER', 'PATIENT', 'APPOINTMENT', 'PRESCRIPTION', 'MEDICINE',
  'INVOICE', 'HOSPITAL', 'AUTH', 'WARD', 'BED', 'ADMISSION', 'VITALS'
] as const;

export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

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
      enum: ACTIVITY_ENTITY_TYPES
    },
    entityId: String,
    description: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

activityLogSchema.index({ tenantId: 1, createdAt: -1 });

export type IActivityLog = InferSchemaType<typeof activityLogSchema>;
export type ActivityLogDoc = HydratedDocument<IActivityLog>;

export { ACTIVITY_ENTITY_TYPES };

export default mongoose.model('ActivityLog', activityLogSchema);
