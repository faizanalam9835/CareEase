const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken, generateRefreshToken } = require('../utils/generateToken');

// User Login
const loginUser = async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;

    // Validation
    if (!email || !password || !tenantId) {
      return res.status(400).json({
        error: 'Email, password and tenant ID are required'
      });
    }

    // Find user by email and tenantId
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      tenantId 
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
        message: "password not match",
        user: user
      });
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({
        error: 'Your account is not active. Please contact administrator.'
      });
    }

    // Generate tokens
    const token = generateToken(user._id, user.tenantId, user.roles, user.department); // ✅ DEPARTMENT ADDED
    const refreshToken = generateRefreshToken(user._id);

    // User details (password exclude karo)
    const userDetails = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department, // ✅ DEPARTMENT INCLUDED
      roles: user.roles,
      tenantId: user.tenantId,
      status: user.status
    };

    res.json({
      message: 'Login successful!',
      token,
      refreshToken,
      user: userDetails,
      expiresIn: '1 hour'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error during login'
    });
  }
};

// Get Current User Profile
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
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

module.exports = { loginUser, getCurrentUser };