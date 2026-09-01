const mongoose = require('mongoose');
const { WARD_TYPES, DEPARTMENTS } = require('../config/constants');

/**
 * A physical ward. Beds live in their own collection and point back here, so a
 * bed can be reserved, occupied or taken out of service independently.
 */
const wardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },

    type: { type: String, enum: WARD_TYPES, default: 'General' },
    department: { type: String, enum: DEPARTMENTS, default: 'General' },
    floor: { type: String, trim: true },

    // Charged per day of stay; copied onto each bed unless the bed overrides it.
    dailyRate: { type: Number, default: 0, min: 0 },

    notes: String,

    tenantId: { type: String, required: true, index: true },
    status: { type: String, enum: ['Active', 'Closed'], default: 'Active' }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

wardSchema.index({ tenantId: 1, code: 1 }, { unique: true });

wardSchema.virtual('beds', {
  ref: 'Bed',
  localField: '_id',
  foreignField: 'ward'
});

module.exports = mongoose.model('Ward', wardSchema);
