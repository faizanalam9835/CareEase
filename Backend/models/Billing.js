const mongoose = require('mongoose');
const { nextId } = require('../utils/sequence');
const {
  INVOICE_ITEM_TYPES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS
} = require('../config/constants');

const invoiceItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true },
    itemType: { type: String, enum: INVOICE_ITEM_TYPES, required: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, min: 0 }
  },
  { _id: true }
);

// Trust quantity x unitPrice rather than a client supplied `amount`.
invoiceItemSchema.pre('validate', function computeAmount() {
  this.amount = Number((this.quantity * this.unitPrice).toFixed(2));
});

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
    transactionId: String,
    paidAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { _id: true }
);

const billingSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, index: true },

    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },

    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },

    items: {
      type: [invoiceItemSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'An invoice needs at least one line item'
      }
    },

    subTotal: { type: Number, default: 0, min: 0 },
    taxPercentage: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0 },

    payments: [paymentSchema],

    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Pending' },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'Cash' },
    paymentDate: Date,
    transactionId: String,

    insuranceProvider: String,
    insuranceClaimAmount: { type: Number, default: 0, min: 0 },

    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    tenantId: { type: String, required: true, index: true },
    status: { type: String, enum: ['Active', 'Cancelled', 'Refunded'], default: 'Active' }
  },
  { timestamps: true }
);

billingSchema.index({ tenantId: 1, invoiceId: 1 }, { unique: true });
billingSchema.index({ tenantId: 1, invoiceDate: -1 });
billingSchema.index({ tenantId: 1, patientId: 1 });
billingSchema.index({ tenantId: 1, paymentStatus: 1 });

/**
 * The money is recomputed from the line items on every save, so a caller can
 * never talk the server into an inconsistent invoice by posting its own totals.
 */
billingSchema.methods.recalculate = function recalculate() {
  this.subTotal = Number(
    this.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)
  );
  this.taxAmount = Number(((this.subTotal * (this.taxPercentage || 0)) / 100).toFixed(2));

  const total = this.subTotal + this.taxAmount - (this.discount || 0);
  this.totalAmount = Number(Math.max(total, 0).toFixed(2));

  this.paidAmount = Number(
    (this.payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0).toFixed(2)
  );
  this.balanceAmount = Number((this.totalAmount - this.paidAmount).toFixed(2));

  if (this.status === 'Cancelled') {
    this.paymentStatus = 'Cancelled';
  } else if (this.status === 'Refunded') {
    this.paymentStatus = 'Refunded';
  } else if (this.balanceAmount <= 0 && this.totalAmount > 0) {
    this.paymentStatus = 'Paid';
    this.paymentDate = this.paymentDate || new Date();
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'Partially_Paid';
  } else {
    this.paymentStatus = 'Pending';
  }

  return this;
};

billingSchema.pre('save', async function beforeSave() {
  if (!this.invoiceId) {
    this.invoiceId = await nextId('invoice', this.tenantId, 'INV');
  }
  this.recalculate();
});

module.exports = mongoose.model('Billing', billingSchema);
