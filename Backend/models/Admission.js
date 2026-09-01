const mongoose = require('mongoose');
const { nextId } = require('../utils/sequence');
const { ADMISSION_STATUSES } = require('../config/constants');

const transferSchema = new mongoose.Schema(
  {
    fromBed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
    fromLabel: String,
    toBed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
    toLabel: String,
    reason: String,
    movedAt: { type: Date, default: Date.now },
    movedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { _id: true }
);

/**
 * One inpatient stay, from admission to discharge. The bed a patient currently
 * occupies is on the Bed document; this records the whole episode, including
 * every transfer, so the history survives the bed being reassigned.
 */
const admissionSchema = new mongoose.Schema(
  {
    admissionId: { type: String, index: true },

    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    bed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
    ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true },

    attendingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: String,

    reason: { type: String, required: true, trim: true },
    diagnosis: String,
    notes: String,

    admittedAt: { type: Date, default: Date.now },
    admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    dischargedAt: Date,
    dischargedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dischargeSummary: String,

    // The rate agreed at admission, so a later change to the ward's price does
    // not silently rewrite what an existing stay is charged.
    dailyRate: { type: Number, default: 0, min: 0 },

    transfers: [transferSchema],

    tenantId: { type: String, required: true, index: true },
    status: { type: String, enum: ADMISSION_STATUSES, default: 'Active' }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

admissionSchema.index({ tenantId: 1, admissionId: 1 }, { unique: true });
admissionSchema.index({ tenantId: 1, status: 1, admittedAt: -1 });
admissionSchema.index({ tenantId: 1, patient: 1 });

/** Whole days occupied so far; a stay always counts as at least one day. */
admissionSchema.virtual('lengthOfStayDays').get(function () {
  const end = this.dischargedAt ? new Date(this.dischargedAt) : new Date();
  const days = Math.ceil((end - new Date(this.admittedAt)) / 86400000);
  return Math.max(days, 1);
});

admissionSchema.virtual('roomCharges').get(function () {
  return Number((this.lengthOfStayDays * (this.dailyRate || 0)).toFixed(2));
});

admissionSchema.pre('save', async function assignAdmissionId() {
  if (this.admissionId) return;
  this.admissionId = await nextId('admission', this.tenantId, 'ADM');
});

module.exports = mongoose.model('Admission', admissionSchema);
