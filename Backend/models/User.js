const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  professionalemail: {
    type: String,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true, // ✅ DEPARTMENT REQUIRED
    enum: ['Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Emergency', 'Administration', 'General']
  },
  roles: [{
    type: String,
    enum: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST'],
    required: true
  }],
  tenantId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'LOCKED', 'PASSWORD_EXPIRED'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

// Password hash karna before save
userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

module.exports = mongoose.model('User', userSchema);