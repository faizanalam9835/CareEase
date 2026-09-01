const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    adminEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    website: { type: String, trim: true },
    bedCapacity: { type: Number, default: 50, min: 0 },

    tenantId: { type: String, required: true, unique: true },

    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'INACTIVE'],
      default: 'PENDING'
    },

    verificationToken: { type: String, select: false },
    verificationTokenExpiry: { type: Date, select: false },
    verifiedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model('Hospital', hospitalSchema);
