// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  professionalemail: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true,
    enum: ['Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Emergency', 'Administration', 'General']
  },
  roles: [{
    type: String,
    enum: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST'],
    required: true
  }],
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'LOCKED', 'PASSWORD_EXPIRED'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

// ✅ REMOVE GLOBAL UNIQUE CONSTRAINT
// ✅ ADD COMPOUND INDEX FOR TENANT-SPECIFIC UNIQUENESS
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
userSchema.index({ professionalemail: 1, tenantId: 1 }, { unique: true });

// Password hash middleware


module.exports = mongoose.model('User', userSchema);