import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';
import { nextId } from '../utils/sequence';
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  DEPARTMENTS
} from '../config/constants';

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, index: true },

    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: String, required: true },
    durationMinutes: { type: Number, default: 30, min: 5 },

    appointmentType: { type: String, enum: APPOINTMENT_TYPES, default: 'OPD' },
    department: { type: String, enum: DEPARTMENTS, required: true },

    reason: { type: String, required: true },
    symptoms: [String],

    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'Scheduled' },

    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Refunded'], default: 'Pending' },
    amount: { type: Number, default: 0, min: 0 },

    doctorNotes: String,
    cancellationReason: String,

    // Voice bookings are matched to their Sarvam call recording by time.
    source: { type: String, enum: ['Staff', 'Voice'], default: 'Staff' },

    tenantId: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

appointmentSchema.index({ tenantId: 1, appointmentId: 1 }, { unique: true });
appointmentSchema.index({ tenantId: 1, doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ tenantId: 1, patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ tenantId: 1, status: 1, appointmentDate: 1 });

appointmentSchema.pre('save', async function assignAppointmentId() {
  if (this.appointmentId) return;
  this.appointmentId = await nextId('appointment', this.tenantId, 'APT');
});

export type IAppointment = InferSchemaType<typeof appointmentSchema>;
export type AppointmentDoc = HydratedDocument<IAppointment>;

export default mongoose.model('Appointment', appointmentSchema);
