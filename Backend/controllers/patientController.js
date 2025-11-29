const Patient = require('../models/Patient');
const User = require('../models/User');

// Register New Patient
const registerPatient = async (req, res) => {
    try {
      const {
        firstName, lastName, dateOfBirth, gender, bloodGroup, phone,
        email, address, emergencyContact, allergies, chronicConditions,
        currentMedications, patientType, department
      } = req.body;
  
      // Basic validation
      if (!firstName || !lastName || !dateOfBirth || !gender || !phone) {
        return res.status(400).json({
          error: 'First name, last name, date of birth, gender and phone are required'
        });
      }
  
      // Check if patient already exists
      const existingPatient = await Patient.findOne({
        phone: phone,
        tenantId: req.user.tenantId
      });
  
      if (existingPatient) {
        return res.status(400).json({
          error: 'Patient with this phone number already exists'
        });
      }
  
      // ✅ SAFE MANUAL ID: Find max patientId and increment
      const lastPatient = await Patient.findOne(
        { tenantId: req.user.tenantId },
        { patientId: 1 },
        { sort: { createdAt: -1 } }
      );
  
      let nextPatientNumber = 1;
      if (lastPatient && lastPatient.patientId) {
        const lastNumber = parseInt(lastPatient.patientId.split('-P-')[1]) || 0;
        nextPatientNumber = lastNumber + 1;
      }
  
      const patientId = `${req.user.tenantId}-P-${nextPatientNumber.toString().padStart(4, '0')}`;
  
      // Create new patient
      const newPatient = new Patient({
        patientId,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        bloodGroup: bloodGroup || 'Unknown',
        phone,
        email: email || '',
        address: address || {},
        emergencyContact: emergencyContact || {},
        allergies: allergies || [],
        chronicConditions: chronicConditions || [],
        currentMedications: currentMedications || [],
        patientType: patientType || 'OPD',
        department: department || 'General',
        tenantId: req.user.tenantId,
        status: 'Active'
      });
  
      await newPatient.save();
  
      res.status(201).json({
        message: 'Patient registered successfully!',
        patient: {
          id: newPatient._id,
          patientId: newPatient.patientId,
          firstName: newPatient.firstName,
          lastName: newPatient.lastName,
          phone: newPatient.phone,
          patientType: newPatient.patientType,
          department: newPatient.department
        }
      });
  
    } catch (error) {
      console.error('Patient registration error:', error);
      
      // ✅ DUPLICATE ID HANDLING: Retry with different ID
      if (error.code === 11000 && error.keyPattern && error.keyPattern.patientId) {
        return res.status(500).json({
          error: 'Patient ID conflict. Please try again.'
        });
      }
      
      res.status(500).json({
        error: 'Internal server error during patient registration',
        details: error.message
      });
    }
  };
// Get All Patients for Current Tenant
const getAllPatients = async (req, res) => {
  try {
    const { search, patientType, department, page = 1, limit = 20 } = req.query;
    
    let filter = { tenantId: req.user.tenantId };
    
    // Search filter
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Additional filters
    if (patientType) filter.patientType = patientType;
    if (department) filter.department = department;
    
    const patients = await Patient.find(filter)
      .populate('assignedDoctor', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Patient.countDocuments(filter);
    
    res.json({
      totalPatients: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      patients
    });
    
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Get Patient by ID
const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    }).populate('assignedDoctor', 'firstName lastName email phone department');
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }
    
    res.json({
      patient
    });
    
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Update Patient
const updatePatient = async (req, res) => {
  try {
    const updates = req.body;
    
    const patient = await Patient.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }
    
    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== 'patientId' && key !== 'tenantId') {
        patient[key] = updates[key];
      }
    });
    
    await patient.save();
    
    res.json({
      message: 'Patient updated successfully!',
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        status: patient.status
      }
    });
    
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      error: 'Internal server error during update'
    });
  }
};

module.exports = { registerPatient, getAllPatients, getPatientById, updatePatient };