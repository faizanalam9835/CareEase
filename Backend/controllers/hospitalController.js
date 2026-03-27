const Hospital = require('../models/Hospital');
const User = require('../models/User'); // ✅ ADD THIS LINE
const { resend } = require('../utils/resendClient');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Hospital Self-Registration
const registerHospital = async (req, res) => {
  try {
    console.log("📥 Incoming Request Body:", req.body);

    const { name, address, contactNumber, adminEmail, licenseNumber } = req.body;

    // Basic validation
    if (!name || !address || !contactNumber || !adminEmail || !licenseNumber) {
      console.log("❌ Validation Failed - Missing Fields");
      return res.status(400).json({
        error: 'All fields are required'
      });
    }

    console.log("✅ Validation Passed");

    // Check if hospital exists
    console.log("🔍 Checking existing hospital...");
    const existingHospital = await Hospital.findOne({ 
      $or: [{ licenseNumber }, { adminEmail }]
    });

    if (existingHospital) {
      console.log("❌ Hospital already exists:", existingHospital);
      return res.status(400).json({
        error: 'Hospital with this license number or email already exists'
      });
    }

    console.log("✅ No existing hospital found");

    // Generate tenant ID
    const tenantId = `T${uuidv4().split('-')[0].toUpperCase()}`;
    console.log("🆔 Generated Tenant ID:", tenantId);

    // Generate verification token
    const verificationToken = uuidv4();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log("🔑 Verification Token:", verificationToken);
    console.log("⏳ Token Expiry:", verificationTokenExpiry);

    // Create verification link
    const verificationLink = `https://care-ease-six.vercel.app/verify/${verificationToken}`;
    console.log("🔗 Verification Link:", verificationLink);

    // Create hospital
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

    console.log("💾 Saving hospital to DB...");
    await newHospital.save();
    console.log("✅ Hospital saved:", newHospital._id);

    // Send email
    try {
      console.log("📧 Sending email to:", adminEmail);

      const emailResponse = await resend.emails.send({
        from: `HMS <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: 'Verify Your Hospital Registration - HMS',
        html: `
          <h2>Welcome to Hospital Management System!</h2>
          <p>Dear ${name},</p>
          <p>Please verify your email:</p>
          <a href="${verificationLink}" 
            style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
          <p>Token: ${verificationToken}</p>
          <p><strong>Tenant ID:</strong> ${tenantId}</p>
        `
      });

      console.log("✅ Email sent successfully");
      console.log("📨 Email Response:", emailResponse);
      console.log("📌 FINAL VERIFICATION LINK SENT:", verificationLink);

    } catch (emailError) {
      console.error("❌ Email sending failed:", emailError);
      console.log("⚠️ But hospital is still saved in DB");
    }

    console.log("🎉 Registration Completed Successfully");

    res.status(201).json({
      message: 'Hospital registered successfully. Please check your email for verification.',
      tenantId,
      hospitalId: newHospital._id,
      status: 'PENDING',
      verificationToken,
      verificationLink // optional for testing
    });

  } catch (error) {
    console.error("💥 Hospital registration error:", error);
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
        password: tempPassword,
        singlepass:hashedPassword, // Temporary, real app mein email bhejna chahiye
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