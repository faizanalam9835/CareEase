const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');

// Create New Prescription
const createPrescription = async (req, res) => {
  try {
    const {
      patientId,
      diagnosis,
      symptoms,
      medicines,
      testsRecommended,
      followUpDate,
      notes
    } = req.body;

    // Validation
    if (!patientId || !diagnosis || !medicines || medicines.length === 0) {
      return res.status(400).json({
        error: 'Patient ID, diagnosis and at least one medicine are required'
      });
    }

    // Check if patient exists and belongs to same tenant
    const patient = await Patient.findOne({
      _id: patientId,
      tenantId: req.user.tenantId
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }

    // ✅ EXTRA DEPARTMENT VALIDATION (Double Security)
    if (req.user.roles.includes('DOCTOR') && req.user.department !== patient.department) {
      return res.status(403).json({
        error: 'Access denied',
        message: `You can only prescribe for patients in your department (${req.user.department})`
      });
    }

    // Create new prescription
    const newPrescription = new Prescription({
      patientId,
      doctorId: req.user.userId,
      diagnosis,
      symptoms: symptoms || [],
      medicines,
      testsRecommended: testsRecommended || [],
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      notes: notes || '',
      tenantId: req.user.tenantId,
      status: 'Active'
    });

    await newPrescription.save();

    // Populate patient and doctor details
    await newPrescription.populate('patientId', 'firstName lastName patientId phone department');
    await newPrescription.populate('doctorId', 'firstName lastName department');

    res.status(201).json({
      message: 'Prescription created successfully!',
      prescription: {
        id: newPrescription._id,
        prescriptionId: newPrescription.prescriptionId,
        patient: newPrescription.patientId,
        doctor: newPrescription.doctorId,
        diagnosis: newPrescription.diagnosis,
        medicines: newPrescription.medicines,
        status: newPrescription.status
      }
    });

  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({
      error: 'Internal server error during prescription creation'
    });
  }
};

// Get Prescriptions by Patient ID
const getPrescriptionsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status } = req.query;

    let filter = { 
      patientId, 
      tenantId: req.user.tenantId 
    };

    if (status) {
      filter.status = status;
    }

    const prescriptions = await Prescription.find(filter)
      .populate('patientId', 'firstName lastName patientId phone')
      .populate('doctorId', 'firstName lastName department')
      .sort({ createdAt: -1 });

    res.json({
      count: prescriptions.length,
      prescriptions
    });

  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Get Prescription by ID
const getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    })
    .populate('patientId', 'firstName lastName patientId phone dateOfBirth gender bloodGroup')
    .populate('doctorId', 'firstName lastName department email phone');

    if (!prescription) {
      return res.status(404).json({
        error: 'Prescription not found'
      });
    }

    res.json({
      prescription
    });

  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Update Prescription Status (Pharmacy)
const updatePrescriptionStatus = async (req, res) => {
  try {
    const { pharmacyStatus } = req.body;

    const prescription = await Prescription.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!prescription) {
      return res.status(404).json({
        error: 'Prescription not found'
      });
    }

    // Only pharmacist can update pharmacy status
    if (req.user.roles.includes('PHARMACIST')) {
      prescription.pharmacyStatus = pharmacyStatus;
    }

    await prescription.save();

    res.json({
      message: 'Prescription status updated successfully!',
      prescription: {
        id: prescription._id,
        prescriptionId: prescription.prescriptionId,
        pharmacyStatus: prescription.pharmacyStatus
      }
    });

  } catch (error) {
    console.error('Update prescription error:', error);
    res.status(500).json({
      error: 'Internal server error during update'
    });
  }
};

// Get All Prescriptions for Current Tenant (Admin View)
const getAllPrescriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, pharmacyStatus } = req.query;
    
    let filter = { tenantId: req.user.tenantId };
    
    if (status) filter.status = status;
    if (pharmacyStatus) filter.pharmacyStatus = pharmacyStatus;
    
    const prescriptions = await Prescription.find(filter)
      .populate('patientId', 'firstName lastName patientId phone')
      .populate('doctorId', 'firstName lastName department')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Prescription.countDocuments(filter);
    
    res.json({
      totalPrescriptions: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      prescriptions
    });
    
  } catch (error) {
    console.error('Get all prescriptions error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = { 
  createPrescription, 
  getPrescriptionsByPatient, 
  getPrescriptionById, 
  updatePrescriptionStatus,
  getAllPrescriptions  // ✅ NEW FUNCTION ADDED
};