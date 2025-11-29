const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');

// Add New Medicine to Inventory
const addMedicine = async (req, res) => {
  try {
    const {
      name,
      genericName,
      brand,
      category,
      dosage,
      description,
      stockQuantity,
      reorderLevel,
      unitPrice,
      sideEffects,
      contraindications,
      storageInstructions,
      expiryDate
    } = req.body;

    // Validation
    if (!name || !genericName || !brand || !category || !dosage || !unitPrice) {
      return res.status(400).json({
        error: 'Name, generic name, brand, category, dosage and unit price are required'
      });
    }

    // Check if medicine already exists with same name and dosage
    const existingMedicine = await Medicine.findOne({
      name: name.toLowerCase(),
      dosage,
      tenantId: req.user.tenantId
    });

    if (existingMedicine) {
      return res.status(400).json({
        error: 'Medicine with same name and dosage already exists'
      });
    }

    // Create new medicine
    const newMedicine = new Medicine({
      name: name.toLowerCase(),
      genericName,
      brand,
      category,
      dosage,
      description: description || '',
      stockQuantity: stockQuantity || 0,
      reorderLevel: reorderLevel || 10,
      unitPrice,
      sideEffects: sideEffects || [],
      contraindications: contraindications || [],
      storageInstructions: storageInstructions || '',
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      tenantId: req.user.tenantId,
      status: 'Active'
    });

    await newMedicine.save();

    res.status(201).json({
      message: 'Medicine added to inventory successfully!',
      medicine: {
        id: newMedicine._id,
        medicineId: newMedicine.medicineId,
        name: newMedicine.name,
        brand: newMedicine.brand,
        dosage: newMedicine.dosage,
        stockQuantity: newMedicine.stockQuantity,
        unitPrice: newMedicine.unitPrice,
        status: newMedicine.status
      }
    });

  } catch (error) {
    console.error('Add medicine error:', error);
    res.status(500).json({
      error: 'Internal server error while adding medicine'
    });
  }
};

// Get All Medicines with Filters
const getAllMedicines = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      status,
      lowStock = false 
    } = req.query;
    
    let filter = { tenantId: req.user.tenantId };
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Additional filters
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (lowStock === 'true') {
      filter.stockQuantity = { $lte: filter.reorderLevel || 10 };
    }
    
    const medicines = await Medicine.find(filter)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Medicine.countDocuments(filter);
    
    // Low stock alert
    const lowStockMedicines = await Medicine.find({
      tenantId: req.user.tenantId,
      stockQuantity: { $lte: 10 }
    }).countDocuments();
    
    res.json({
      totalMedicines: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      lowStockAlert: lowStockMedicines,
      medicines
    });
    
  } catch (error) {
    console.error('Get medicines error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Update Medicine Stock
const updateMedicineStock = async (req, res) => {
  try {
    const { stockQuantity, unitPrice, reorderLevel, status } = req.body;

    const medicine = await Medicine.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!medicine) {
      return res.status(404).json({
        error: 'Medicine not found'
      });
    }

    // Update fields
    if (stockQuantity !== undefined) medicine.stockQuantity = stockQuantity;
    if (unitPrice !== undefined) medicine.unitPrice = unitPrice;
    if (reorderLevel !== undefined) medicine.reorderLevel = reorderLevel;
    if (status) medicine.status = status;

    // Auto update status based on stock
    if (medicine.stockQuantity === 0) {
      medicine.status = 'Out_of_Stock';
    } else if (medicine.stockQuantity > 0 && medicine.status === 'Out_of_Stock') {
      medicine.status = 'Active';
    }

    await medicine.save();

    res.json({
      message: 'Medicine stock updated successfully!',
      medicine: {
        id: medicine._id,
        medicineId: medicine.medicineId,
        name: medicine.name,
        stockQuantity: medicine.stockQuantity,
        unitPrice: medicine.unitPrice,
        status: medicine.status
      }
    });

  } catch (error) {
    console.error('Update medicine error:', error);
    res.status(500).json({
      error: 'Internal server error during update'
    });
  }
};

// Get Low Stock Medicines
const getLowStockMedicines = async (req, res) => {
  try {
    const lowStockMedicines = await Medicine.find({
      tenantId: req.user.tenantId,
      stockQuantity: { $lte: 10 },
      status: { $ne: 'Discontinued' }
    }).sort({ stockQuantity: 1 });

    res.json({
      count: lowStockMedicines.length,
      medicines: lowStockMedicines
    });

  } catch (error) {
    console.error('Get low stock medicines error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Dispense Prescription (Pharmacist)
const dispensePrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { dispensedMedicines } = req.body; // Array of { medicineId, quantityDispensed }

    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      tenantId: req.user.tenantId
    }).populate('medicines.medicineId');

    if (!prescription) {
      return res.status(404).json({
        error: 'Prescription not found'
      });
    }

    // Check stock and update
    for (const dispensed of dispensedMedicines) {
      const medicine = await Medicine.findOne({
        medicineId: dispensed.medicineId,
        tenantId: req.user.tenantId
      });

      if (!medicine) {
        return res.status(404).json({
          error: `Medicine ${dispensed.medicineId} not found`
        });
      }

      if (medicine.stockQuantity < dispensed.quantityDispensed) {
        return res.status(400).json({
          error: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}`
        });
      }

      // Update stock
      medicine.stockQuantity -= dispensed.quantityDispensed;
      await medicine.save();
    }

    // Update prescription status
    prescription.pharmacyStatus = 'Dispensed';
    await prescription.save();

    res.json({
      message: 'Prescription dispensed successfully!',
      prescription: {
        id: prescription._id,
        prescriptionId: prescription.prescriptionId,
        pharmacyStatus: prescription.pharmacyStatus
      }
    });

  } catch (error) {
    console.error('Dispense prescription error:', error);
    res.status(500).json({
      error: 'Internal server error during dispensing'
    });
  }
};

module.exports = {
  addMedicine,
  getAllMedicines,
  updateMedicineStock,
  getLowStockMedicines,
  dispensePrescription
};