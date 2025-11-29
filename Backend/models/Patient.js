const mongoose = require('mongoose');
const Counter = require('./Counter');

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
    default: 'Unknown'
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
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
  patientType: {
    type: String,
    enum: ['OPD', 'IPD'],
    default: 'OPD'
  },
  department: String,
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tenantId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Discharged', 'Deceased'],
    default: 'Active'
  }
}, {
  timestamps: true
});

// ✅ PROFESSIONAL: Auto-increment with counter collection
patientSchema.pre('save', async function() {
  if (this.isNew) {
    try {
      // Find and increment the counter for this tenant
      const counter = await Counter.findByIdAndUpdate(
        `patient_${this.tenantId}`,
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );
      
      this.patientId = `${this.tenantId}-P-${counter.sequence_value.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating patient ID:', error);
      // Fallback: Use timestamp as ID
      this.patientId = `${this.tenantId}-P-${Date.now()}`;
    }
  }
});

module.exports = mongoose.model('Patient', patientSchema);