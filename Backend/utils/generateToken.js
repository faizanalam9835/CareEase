const jwt = require('jsonwebtoken');

const generateToken = (userId, tenantId, roles, department) => {
  return jwt.sign(
    { 
      userId, 
      tenantId, 
      roles,
      department // ✅ DEPARTMENT ADDED TO TOKEN
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '1h'
    }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = { generateToken, generateRefreshToken };