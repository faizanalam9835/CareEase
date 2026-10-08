import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';
import { nextId } from '../utils/sequence';
import { PRESCRIPTION_STATUSES, PHARMACY_STATUSES } from '../config/constants';

const prescribedMedicineSchema = new mongoose.Schema(
  {
    // Optional link to inventory - free-text medicines stay supported.
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    medicineName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    instructions: String,
    quantity: { type: Number, required: true, min: 1 },
    quantityDispensed: { type: Number, default: 0, min: 0 }
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: { type: String, index: true },

    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    diagnosis: { type: String, required: true, trim: true },
    symptoms: [String],
    medicines: {
      type: [prescribedMedicineSchema],
      validate: {
        validator: (value: unknown) => Array.isArray(value) && value.length > 0,
        message: 'A prescription needs at least one medicine'
      }
    },
    testsRecommended: [String],
    followUpDate: Date,
    notes: String,

    department: String,

    status: { type: String, enum: PRESCRIPTION_STATUSES, default: 'Active' },
    pharmacyStatus: { type: String, enum: PHARMACY_STATUSES, default: 'Pending' },
    dispensedAt: Date,
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    tenantId: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

prescriptionSchema.index({ tenantId: 1, prescriptionId: 1 }, { unique: true });
prescriptionSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });
prescriptionSchema.index({ tenantId: 1, pharmacyStatus: 1 });

prescriptionSchema.pre('save', async function assignPrescriptionId() {
  if (this.prescriptionId) return;
  this.prescriptionId = await nextId('prescription', this.tenantId, 'RX');
});

export type IPrescription = InferSchemaType<typeof prescriptionSchema>;
export type PrescriptionDoc = HydratedDocument<IPrescription>;

export default mongoose.model('Prescription', prescriptionSchema);
