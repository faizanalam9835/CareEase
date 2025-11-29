const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true
  },
  itemType: {
    type: String,
    enum: ['Consultation', 'Medicine', 'Test', 'Procedure', 'Room', 'Other'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  }
});

const billingSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  
  // Invoice Details
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [invoiceItemSchema],
  
  // Amounts
  subTotal: {
    type: Number,
    required: true
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number,
    required: true
  },
  
  // Payment Information
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Partially_Paid', 'Cancelled', 'Refunded'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Net Banking', 'Insurance', 'Other'],
    default: 'Cash'
  },
  paymentDate: Date,
  transactionId: String,
  
  // Insurance
  insuranceProvider: String,
  insuranceClaimAmount: {
    type: Number,
    default: 0
  },
  
  // Notes
  notes: String,
  
  // Tenant Isolation
  tenantId: {
    type: String,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Cancelled', 'Refunded'],
    default: 'Active'
  }
}, {
  timestamps: true
});

// Auto-generate invoiceId
billingSchema.pre('save', async function() {
  if (this.isNew) {
    try {
      const count = await mongoose.model('Billing').countDocuments({ 
        tenantId: this.tenantId 
      });
      this.invoiceId = `${this.tenantId}-INV-${(count + 1).toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating invoice ID:', error);
      this.invoiceId = `${this.tenantId}-INV-${Date.now()}`;
    }
  }
});

// Calculate balance amount before save
billingSchema.pre('save', function(next) {
  this.balanceAmount = this.totalAmount - this.paidAmount;
  next();
});

// Indexes for better performance
billingSchema.index({ tenantId: 1, invoiceDate: -1 });
billingSchema.index({ tenantId: 1, patientId: 1 });
billingSchema.index({ tenantId: 1, paymentStatus: 1 });

module.exports = mongoose.model('Billing', billingSchema);