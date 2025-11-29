const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicineName: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  instructions: {
    type: String
  },
  quantity: {
    type: Number,
    required: true
  }
});

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  diagnosis: {
    type: String,
    required: true
  },
  symptoms: [String],
  medicines: [medicineSchema],
  testsRecommended: [String],
  followUpDate: Date,
  notes: String,
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled'],
    default: 'Active'
  },
  
  // Pharmacy
  pharmacyStatus: {
    type: String,
    enum: ['Pending', 'Dispensed', 'Partially_Dispensed', 'Cancelled'],
    default: 'Pending'
  },
  
  // Tenant Isolation
  tenantId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Auto-generate prescriptionId
prescriptionSchema.pre('save', async function() {
  if (this.isNew) {
    try {
      const count = await mongoose.model('Prescription').countDocuments({ 
        tenantId: this.tenantId 
      });
      this.prescriptionId = `${this.tenantId}-RX-${(count + 1).toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating prescription ID:', error);
      this.prescriptionId = `${this.tenantId}-RX-${Date.now()}`;
    }
  }
});

module.exports = mongoose.model('Prescription', prescriptionSchema);