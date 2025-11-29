const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
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
  appointmentDate: {
    type: Date,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  appointmentType: {
    type: String,
    enum: ['OPD', 'Follow-up', 'Consultation', 'Emergency'],
    default: 'OPD'
  },
  department: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  symptoms: [String],
  
  // Status
  status: {
    type: String,
    enum: ['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Refunded'],
    default: 'Pending'
  },
  amount: {
    type: Number,
    default: 0
  },
  
  // Notes
  doctorNotes: String,
  cancellationReason: String,
  
  // Tenant Isolation
  tenantId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Auto-generate appointmentId
appointmentSchema.pre('save', async function() {
  if (this.isNew) {
    try {
      const count = await mongoose.model('Appointment').countDocuments({ 
        tenantId: this.tenantId 
      });
      this.appointmentId = `${this.tenantId}-APT-${(count + 1).toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating appointment ID:', error);
      this.appointmentId = `${this.tenantId}-APT-${Date.now()}`;
    }
  }
});

// Index for better query performance
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);