const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/generateToken');

// Create New User (Only Hospital Admin can do this)
const createUser = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
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

    // Check if user already exists with same email in same tenant
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(),
      tenantId: req.user.tenantId 
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email already exists'
      });
    }

    // Auto-generate password if not provided
    const autoPassword = password || 'Welcome@123';

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password: autoPassword,
      department,
      roles: Array.isArray(roles) ? roles : [roles],
      tenantId: req.user.tenantId,
      status: 'ACTIVE'
    });

    await newUser.save();

    // Return user details (password exclude)
    const userResponse = {
      id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      phone: newUser.phone,
      department: newUser.department,
      roles: newUser.roles,
      tenantId: newUser.tenantId,
      status: newUser.status,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      message: 'User created successfully!',
      user: userResponse,
      temporaryPassword: autoPassword // Show only first time
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Internal server error during user creation'
    });
  }
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