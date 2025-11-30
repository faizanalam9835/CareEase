const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/generateToken');
const sendWelcomeEmail = require("../utils/emailTemplates1")

const createUser = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      professionalemail,
      phone, 
      password, 
      department, 
      roles 
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !department || !roles) {
      return res.status(400).json({
        error: 'All fields are required'
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase(), tenantId: req.user.tenantId },
        { professionalemail: professionalemail?.toLowerCase(), tenantId: req.user.tenantId }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email already exists'
      });
    }

    // ✅ Auto-generate password if not provided
    const autoPassword = password || generateTemporaryPassword();
    console.log('🔑 Generated temporary password:', autoPassword);

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      professionalemail: professionalemail?.toLowerCase() || email.toLowerCase(),
      phone,
      password: autoPassword,
      department,
      roles: Array.isArray(roles) ? roles : [roles],
      tenantId: req.user.tenantId,
      status: 'ACTIVE'
    });

    await newUser.save();
    console.log('✅ User created in database:', newUser.email);

    // ✅ Send email to PROFESSIONAL EMAIL with TEMPORARY PASSWORD
    const emailToSend = professionalemail || email;
    
    console.log('📤 Attempting to send email to:', emailToSend);
    console.log('🔑 Sending temporary password:', autoPassword);

    sendWelcomeEmail(
      {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: emailToSend,
        department: newUser.department,
        roles: newUser.roles
      },
      req.user.hospitalName || 'CareEase Hospital',
      autoPassword, // ✅ YAHI TEMPORARY PASSWORD BHEJ RAHA HUN
      req.user.tenantId
    ).then(result => {
      if (result.success) {
        console.log('✅ SUCCESS: Email sent to professional email:', emailToSend);
        console.log('✅ Temporary password delivered:', autoPassword);
      } else {
        console.error('❌ FAILED: Email not sent to:', emailToSend);
        console.error('❌ Error:', result.error);
      }
    });

    // Response
    const userResponse = {
      id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      professionalemail: newUser.professionalemail,
      phone: newUser.phone,
      department: newUser.department,
      roles: newUser.roles,
      tenantId: newUser.tenantId,
      status: newUser.status,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully! Email sent with temporary password.',
      user: userResponse,
      emailSentTo: emailToSend,
      temporaryPassword: autoPassword // ✅ Response mein bhi dikha raha hun
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during user creation'
    });
  }
};

// ✅ Simple temporary password generator
const generateTemporaryPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$';
  let password = '';
  
  // Ensure mix of characters
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '@#$'[Math.floor(Math.random() * 3)];
  
  // Add remaining characters
  for (let i = 4; i < 10; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Get All Users for Current Tenant
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ 
      tenantId: req.user.tenantId 
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Get User by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, phone, department, roles, status } = req.body;

    const user = await User.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (department) user.department = department;
    if (roles) user.roles = Array.isArray(roles) ? roles : [roles];
    if (status) user.status = status;

    await user.save();

    res.json({
      message: 'User updated successfully!',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        roles: user.roles,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal server error during update'
    });
  }
};

module.exports = { createUser, getAllUsers, getUserById, updateUser };