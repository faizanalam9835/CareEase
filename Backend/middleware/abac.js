// Attribute-Based Access Control Middleware
const departmentAccessControl = (req, res, next) => {
    try {
      const user = req.user;
      const { department } = req.body;
  
      console.log('🔐 ABAC Check - User Department:', user.department);
      console.log('🔐 ABAC Check - Request Department:', department);
  
      // Agar user HOSPITAL_ADMIN ya RECEPTIONIST hai to sab kar sakta hai
      if (user.roles.includes('HOSPITAL_ADMIN') || user.roles.includes('RECEPTIONIST')) {
        console.log('✅ ABAC: Admin/Receptionist - Full Access');
        return next();
      }
  
      // Agar user DOCTOR ya NURSE hai to department check karo
      if (user.roles.includes('DOCTOR') || user.roles.includes('NURSE')) {
        // Agar request mein department nahi hai to allow karo (default department assign hoga)
        if (!department) {
          console.log('✅ ABAC: No department specified - Allowed');
          return next();
        }
  
        // Agar user ka department hai to allow karo
        if (user.department === department) {
          console.log(`✅ ABAC: Same department access - ${user.department}`);
          return next();
        }
  
        // Agar different department ka patient banane ki koshish kar raha hai
        console.log(`❌ ABAC: Department mismatch - User: ${user.department}, Request: ${department}`);
        return res.status(403).json({
          error: 'Access denied',
          message: `You can only register patients in your department (${user.department})`,
          userDepartment: user.department,
          requestedDepartment: department
        });
      }
  
      console.log('✅ ABAC: No restrictions - Allowed');
      next();
    } catch (error) {
      console.error('ABAC middleware error:', error);
      res.status(500).json({
        error: 'Access control error'
      });
    }
  };
  
  // ✅ CORRECT EXPORT - Ye check karo
  module.exports = { departmentAccessControl };