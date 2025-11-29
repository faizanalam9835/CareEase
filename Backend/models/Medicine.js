const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicineId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  genericName: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Other'],
    required: true
  },
  dosage: {
    type: String, // e.g., "500mg", "10ml"
    required: true
  },
  description: String,
  
  // Inventory
  stockQuantity: {
    type: Number,
    required: true,
    default: 0
  },
  reorderLevel: {
    type: Number,
    required: true,
    default: 10
  },
  unitPrice: {
    type: Number,
    required: true
  },
  
  // Medical Information
  sideEffects: [String],
  contraindications: [String],
  storageInstructions: String,
  expiryDate: Date,
  
  // Tenant Isolation
  tenantId: {
    type: String,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Discontinued', 'Out_of_Stock'],
    default: 'Active'
  }
}, {
  timestamps: true
});

// Auto-generate medicineId
medicineSchema.pre('save', async function() {
  if (this.isNew) {
    try {
      const count = await mongoose.model('Medicine').countDocuments({ 
        tenantId: this.tenantId 
      });
      this.medicineId = `${this.tenantId}-MED-${(count + 1).toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating medicine ID:', error);
      this.medicineId = `${this.tenantId}-MED-${Date.now()}`;
    }
  }
});

// Index for better performance
medicineSchema.index({ tenantId: 1, name: 1 });
medicineSchema.index({ tenantId: 1, category: 1 });
medicineSchema.index({ tenantId: 1, stockQuantity: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);