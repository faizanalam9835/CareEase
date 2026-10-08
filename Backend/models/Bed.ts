import mongoose, { type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';
import { BED_STATUSES } from '../config/constants';

const bedSchema = new mongoose.Schema(
  {
    bedNumber: { type: String, required: true, trim: true },
    ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true },

    status: { type: String, enum: BED_STATUSES, default: 'Available' },

    // Set while the bed is occupied; cleared on discharge or transfer out.
    currentAdmission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
    currentPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },

    // Falls back to the ward's rate when zero.
    dailyRate: { type: Number, default: 0, min: 0 },
    notes: String,

    tenantId: { type: String, required: true, index: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export type IBed = InferSchemaType<typeof bedSchema>;

export interface IBedVirtuals {
  isFree: boolean;
}

export type BedModel = Model<IBed, {}, {}, IBedVirtuals>;
export type BedDoc = HydratedDocument<IBed, IBedVirtuals>;

// A bed number is unique within its ward, not across the hospital - two wards
// may both have a bed "01".
bedSchema.index({ tenantId: 1, ward: 1, bedNumber: 1 }, { unique: true });
bedSchema.index({ tenantId: 1, status: 1 });

bedSchema.virtual('isFree').get(function () {
  return this.status === 'Available';
});

export default mongoose.model<IBed, BedModel>('Bed', bedSchema);
