const mongoose = require('mongoose');

/**
 * One set of observations taken at a point in time. Every field is optional
 * except the patient - a nurse doing a quick pulse and SpO2 check should not
 * have to invent a weight to save the record.
 */
const vitalsSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },

    recordedAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    temperature: { type: Number, min: 25, max: 45 },
    pulse: { type: Number, min: 20, max: 250 },
    systolic: { type: Number, min: 40, max: 300 },
    diastolic: { type: Number, min: 20, max: 200 },
    respiratoryRate: { type: Number, min: 4, max: 80 },
    oxygenSaturation: { type: Number, min: 40, max: 100 },
    bloodSugar: { type: Number, min: 20, max: 800 },

    weight: { type: Number, min: 0.5, max: 400 },
    height: { type: Number, min: 20, max: 260 },

    painScore: { type: Number, min: 0, max: 10 },
    notes: String,

    tenantId: { type: String, required: true, index: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

vitalsSchema.index({ tenantId: 1, patient: 1, recordedAt: -1 });

vitalsSchema.virtual('bloodPressure').get(function () {
  if (!this.systolic || !this.diastolic) return null;
  return `${this.systolic}/${this.diastolic}`;
});

vitalsSchema.virtual('bmi').get(function () {
  if (!this.weight || !this.height) return null;
  const metres = this.height / 100;
  return Number((this.weight / (metres * metres)).toFixed(1));
});

/** True when nothing at all was measured, which is not worth storing. */
vitalsSchema.methods.isEmpty = function isEmpty() {
  const measured = [
    'temperature', 'pulse', 'systolic', 'diastolic', 'respiratoryRate',
    'oxygenSaturation', 'bloodSugar', 'weight', 'height', 'painScore'
  ];
  return measured.every((field) => this[field] === undefined || this[field] === null);
};

module.exports = mongoose.model('Vitals', vitalsSchema);
