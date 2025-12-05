const Hospital = require('../models/Hospital');
const User = require('../models/User'); // ✅ ADD THIS LINE
const { resend } = require('../utils/resendClient');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Hospital Self-Registration
const registerHospital = async (req, res) => {
  try {
    const { name, address, contactNumber, adminEmail, licenseNumber } = req.body;

    // Basic validation
    if (!name || !address || !contactNumber || !adminEmail || !licenseNumber) {
      return res.status(400).json({
        error: 'All fields are required'
      });
    }

    // Check if license number already exists
    const existingHospital = await Hospital.findOne({ 
      $or: [
        { licenseNumber },
        { adminEmail }
      ]
    });

    if (existingHospital) {
      return res.status(400).json({
        error: 'Hospital with this license number or email already exists'
      });
    }

    // Generate unique tenant ID
    const tenantId = `T${uuidv4().split('-')[0].toUpperCase()}`;
    
    // Generate verification token
    const verificationToken = uuidv4();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new hospital
    const newHospital = new Hospital({
      name,
      address,
      contactNumber,
      adminEmail,
      licenseNumber,
      tenantId,
      verificationToken,
      verificationTokenExpiry,
      status: 'PENDING'
    });

    await newHospital.save();

    // Send verification email using Resend
    try {
      await resend.emails.send({
        from: 'HMS <onboarding@resend.dev>',
        to: adminEmail,
        subject: 'Verify Your Hospital Registration - HMS',
        html: `
          <h2>Welcome to Hospital Management System!</h2>
          <p>Dear ${name},</p>
          <p>Your hospital registration is almost complete. Please click the link below to verify your email:</p>
          <a href="http://localhost:5000/api/hospitals/verify/${verificationToken}" 
            style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
          verification token : ${verificationToken}
          <p><strong>Your Tenant ID:</strong> ${tenantId}</p>
          <p>This link will expire in 24 hours.</p>
        `
      });
      console.log(`✅ Verification email sent to: ${adminEmail}`);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      // Email fail hua to bhi hospital save ho jayega
    }

    res.status(201).json({
      message: 'Hospital registered successfully. Please check your email for verification.',
      tenantId: tenantId,
      hospitalId: newHospital._id,
      status: 'PENDING',
      verificationToken
    });

  } catch (error) {
    console.error('Hospital registration error:', error);
    res.status(500).json({
      error: 'Internal server error during registration'
    });
  }
};

// Email Verification
const verifyHospital = async (req, res) => {
  try {
    console.log("hello")
    const { token } = req.params;

    const hospital = await Hospital.findOne({
      verificationToken: token
    });

    if (!hospital) {
      return res.status(400).json({
        error: 'Invalid verification token'
      });
    }

    // ✅ AUTO CREATE ADMIN USER
    const tempPassword = 'Admin@123'; // Temporary password
    const hashedPassword = await bcrypt.hash(tempPassword, 12)
    const adminUser = new User({
      firstName: 'Admin',
      lastName: hospital.name,
      email: hospital.adminEmail,
      phone: hospital.contactNumber,
      password: hashedPassword,
      department: 'Administration',
      roles: ['HOSPITAL_ADMIN'],
      tenantId: hospital.tenantId,
      status: 'ACTIVE'
    });

    await adminUser.save();

    // Update hospital status
    hospital.status = 'ACTIVE';
    hospital.verificationToken = undefined;
    hospital.verificationTokenExpiry = undefined;
    await hospital.save();

    res.json({
      message: 'Hospital verified successfully! Admin user created.',
      hospitalId: hospital._id,
      tenantId: hospital.tenantId,
      adminUser: {
        id: adminUser._id,
        email: adminUser.email,
        password: tempPassword, // Temporary, real app mein email bhejna chahiye
        roles: adminUser.roles
      }
    });

  } catch (error) {
    console.log(error)
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Internal server error during verification',
      details: error.message // ✅ Error details bhi bhejo
    });
  }
};

// Get all hospitals (Super Admin ke liye)
const getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find({}, { verificationToken: 0, verificationTokenExpiry: 0 });
    
    res.json({
      count: hospitals.length,
      hospitals
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = { registerHospital, verifyHospital, getAllHospitals };