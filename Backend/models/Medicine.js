const mongoose = require('mongoose');
const { nextId } = require('../utils/sequence');
const { MEDICINE_CATEGORIES } = require('../config/constants');

const medicineSchema = new mongoose.Schema(
  {
    medicineId: { type: String, index: true },

    name: { type: String, required: true, trim: true },
    genericName: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, enum: MEDICINE_CATEGORIES, required: true },
    dosage: { type: String, required: true, trim: true },
    description: String,

    stockQuantity: { type: Number, required: true, default: 0, min: 0 },
    reorderLevel: { type: Number, required: true, default: 10, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },

    sideEffects: [String],
    contraindications: [String],
    storageInstructions: String,
    batchNumber: String,
    expiryDate: Date,

    tenantId: { type: String, required: true, index: true },

    status: {
      type: String,
      enum: ['Active', 'Discontinued', 'Out_of_Stock'],
      default: 'Active'
    }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

medicineSchema.index({ tenantId: 1, medicineId: 1 }, { unique: true });
medicineSchema.index({ tenantId: 1, name: 1, dosage: 1 });
medicineSchema.index({ tenantId: 1, category: 1 });

// `isLowStock` compares against the medicine's own reorder level. The old
// controller hard-coded `<= 10` everywhere, which ignored the configured level.
medicineSchema.virtual('isLowStock').get(function () {
  return this.stockQuantity <= this.reorderLevel;
});

medicineSchema.virtual('isExpired').get(function () {
  return Boolean(this.expiryDate && new Date(this.expiryDate) < new Date());
});

medicineSchema.virtual('stockValue').get(function () {
  return Number(((this.stockQuantity || 0) * (this.unitPrice || 0)).toFixed(2));
});

medicineSchema.pre('save', async function assignMedicineId() {
  if (!this.medicineId) {
    this.medicineId = await nextId('medicine', this.tenantId, 'MED');
  }
  // Keep status honest with stock without the caller having to remember.
  if (this.status !== 'Discontinued') {
    this.status = this.stockQuantity > 0 ? 'Active' : 'Out_of_Stock';
  }
});

module.exports = mongoose.model('Medicine', medicineSchema);
