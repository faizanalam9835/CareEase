const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  adminEmail: {
    type: String,
    required: true,
    unique: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  tenantId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'INACTIVE'],
    default: 'PENDING'
  },
  verificationToken: String,
  verificationTokenExpiry: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Hospital', hospitalSchema);
