const mongoose = require('mongoose');
const { nextId } = require('../utils/sequence');
const {
  BLOOD_GROUPS,
  GENDERS,
  PATIENT_TYPES,
  PATIENT_STATUSES,
  DEPARTMENTS
} = require('../config/constants');

const patientSchema = new mongoose.Schema(
  {
    patientId: { type: String, index: true },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: GENDERS, required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, default: 'Unknown' },

    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },

    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    },

    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    },

    allergies: [String],
    chronicConditions: [String],
    currentMedications: [String],

    patientType: { type: String, enum: PATIENT_TYPES, default: 'OPD' },
    department: { type: String, enum: DEPARTMENTS, default: 'General' },

    assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // IPD only
    admissionDate: Date,
    dischargeDate: Date,
    roomNumber: String,

    notes: String,

    tenantId: { type: String, required: true, index: true },
    status: { type: String, enum: PATIENT_STATUSES, default: 'Active' }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

patientSchema.index({ tenantId: 1, patientId: 1 }, { unique: true });
patientSchema.index({ tenantId: 1, phone: 1 });
patientSchema.index({ tenantId: 1, department: 1, status: 1 });

patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

patientSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - new Date(this.dateOfBirth).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
});

// `pre('save')` must await the id before the document is written. The old hook
// was an async function without `next`, so Mongoose sometimes persisted the
// document before patientId existed.
patientSchema.pre('save', async function assignPatientId() {
  if (this.patientId) return;
  this.patientId = await nextId('patient', this.tenantId, 'P');
});

module.exports = mongoose.model('Patient', patientSchema);
