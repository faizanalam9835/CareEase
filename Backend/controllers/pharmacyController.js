const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const Billing = require('../models/Billing');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { logActivity } = require('../utils/activityLog');
const { getPagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { withTransaction } = require('../utils/transactions');
const { MEDICINE_CATEGORIES } = require('../config/constants');

/** POST /api/pharmacy/medicines */
const addMedicine = asyncHandler(async (req, res) => {
  const { name, genericName, brand, category, dosage, unitPrice } = req.body;

  if (!name || !genericName || !brand || !category || !dosage || unitPrice === undefined) {
    throw ApiError.badRequest(
      'Name, generic name, brand, category, dosage and unit price are required'
    );
  }
  if (!MEDICINE_CATEGORIES.includes(category)) {
    throw ApiError.badRequest(`Category must be one of: ${MEDICINE_CATEGORIES.join(', ')}`);
  }
  if (Number(unitPrice) < 0) throw ApiError.badRequest('Unit price cannot be negative');

  // Case-insensitive duplicate check. The old code lower-cased the name before
  // storing it, so every medicine in the list displayed in lowercase.
  const duplicate = await Medicine.findOne({
    tenantId: req.user.tenantId,
    name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    dosage
  });
  if (duplicate) {
    throw ApiError.conflict(`${name} ${dosage} is already in the inventory (${duplicate.medicineId})`);
  }

  const medicine = await Medicine.create({
    name: String(name).trim(),
    genericName,
    brand,
    category,
    dosage,
    description: req.body.description || '',
    stockQuantity: req.body.stockQuantity ?? 0,
    reorderLevel: req.body.reorderLevel ?? 10,
    unitPrice,
    sideEffects: req.body.sideEffects || [],
    contraindications: req.body.contraindications || [],
    storageInstructions: req.body.storageInstructions || '',
    batchNumber: req.body.batchNumber,
    expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
    tenantId: req.user.tenantId
  });

  logActivity({
    user: req.user,
    action: 'MEDICINE_ADDED',
    entityType: 'MEDICINE',
    entityId: medicine._id,
    description: `Added ${medicine.name} ${medicine.dosage} to the inventory`
  });

  res.status(201).json({ success: true, message: 'Medicine added to inventory', medicine });
});

/** GET /api/pharmacy/medicines */
const getAllMedicines = asyncHandler(async (req, res) => {
  const { search, category, status, lowStock, expiringSoon } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = { tenantId: req.user.tenantId };

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { genericName: pattern }, { brand: pattern }, { medicineId: pattern }];
  }
  if (category && category !== 'All') filter.category = category;
  if (status && status !== 'All') filter.status = status;

  // `lowStock` compares each medicine with its own reorder level. The previous
  // implementation compared against `filter.reorderLevel`, which was always
  // undefined, so the filter silently fell back to a hard-coded 10.
  if (String(lowStock) === 'true') {
    filter.$expr = { $lte: ['$stockQuantity', '$reorderLevel'] };
  }
  if (String(expiringSoon) === 'true') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 90);
    filter.expiryDate = { $ne: null, $lte: cutoff };
  }

  const [medicines, total, summary] = await Promise.all([
    Medicine.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Medicine.countDocuments(filter),
    Medicine.aggregate([
      { $match: { tenantId: req.user.tenantId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          outOfStock: { $sum: { $cond: [{ $lte: ['$stockQuantity', 0] }, 1, 0] } },
          lowStock: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$stockQuantity', 0] }, { $lte: ['$stockQuantity', '$reorderLevel'] }] },
                1,
                0
              ]
            }
          },
          stockValue: { $sum: { $multiply: ['$stockQuantity', '$unitPrice'] } }
        }
      }
    ])
  ]);

  const expiringSoonCount = await Medicine.countDocuments({
    tenantId: req.user.tenantId,
    expiryDate: { $ne: null, $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
  });

  const stats = summary[0] || { totalItems: 0, outOfStock: 0, lowStock: 0, stockValue: 0 };

  res.json({
    success: true,
    medicines,
    totalMedicines: total,
    currentPage: page,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    meta: buildMeta(total, page, limit),
    stats: {
      ...stats,
      stockValue: Number((stats.stockValue || 0).toFixed(2)),
      expiringSoon: expiringSoonCount
    },
    lowStockAlert: stats.lowStock + stats.outOfStock
  });
});

/** GET /api/pharmacy/medicines/low-stock */
const getLowStockMedicines = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({
    tenantId: req.user.tenantId,
    status: { $ne: 'Discontinued' },
    $expr: { $lte: ['$stockQuantity', '$reorderLevel'] }
  }).sort({ stockQuantity: 1 });

  res.json({ success: true, count: medicines.length, medicines });
});

/** GET /api/pharmacy/medicines/expiring */
const getExpiringMedicines = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 90, 1), 365);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const medicines = await Medicine.find({
    tenantId: req.user.tenantId,
    expiryDate: { $ne: null, $lte: cutoff }
  }).sort({ expiryDate: 1 });

  res.json({ success: true, withinDays: days, count: medicines.length, medicines });
});

/** GET /api/pharmacy/medicines/:id */
const getMedicineById = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!medicine) throw ApiError.notFound('Medicine not found');
  res.json({ success: true, medicine });
});

/** PUT /api/pharmacy/medicines/:id - full edit. */
const updateMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!medicine) throw ApiError.notFound('Medicine not found');

  const editable = [
    'name', 'genericName', 'brand', 'category', 'dosage', 'description',
    'stockQuantity', 'reorderLevel', 'unitPrice', 'sideEffects',
    'contraindications', 'storageInstructions', 'batchNumber', 'status'
  ];
  for (const field of editable) {
    if (req.body[field] !== undefined) medicine[field] = req.body[field];
  }
  if (req.body.expiryDate !== undefined) {
    medicine.expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : undefined;
  }

  await medicine.save();
  res.json({ success: true, message: 'Medicine updated', medicine });
});

/**
 * PUT /api/pharmacy/medicines/:id/stock
 * `mode` of 'add' or 'remove' applies a delta; anything else sets an absolute
 * value. Restocking used to require the pharmacist to compute the new total.
 */
const updateMedicineStock = asyncHandler(async (req, res) => {
  const { stockQuantity, mode, unitPrice, reorderLevel, status, batchNumber, expiryDate } = req.body;

  const medicine = await Medicine.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!medicine) throw ApiError.notFound('Medicine not found');

  if (stockQuantity !== undefined) {
    const quantity = Number(stockQuantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw ApiError.badRequest('Quantity must be a positive number');
    }

    if (mode === 'add') medicine.stockQuantity += quantity;
    else if (mode === 'remove') {
      if (quantity > medicine.stockQuantity) {
        throw ApiError.badRequest(
          `Only ${medicine.stockQuantity} unit(s) of ${medicine.name} are in stock`
        );
      }
      medicine.stockQuantity -= quantity;
    } else medicine.stockQuantity = quantity;
  }

  if (unitPrice !== undefined) medicine.unitPrice = unitPrice;
  if (reorderLevel !== undefined) medicine.reorderLevel = reorderLevel;
  if (batchNumber !== undefined) medicine.batchNumber = batchNumber;
  if (expiryDate !== undefined) medicine.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
  // The model keeps Active/Out_of_Stock in step with the quantity; only an
  // explicit Discontinued needs to be set here.
  if (status === 'Discontinued') medicine.status = 'Discontinued';

  await medicine.save();

  logActivity({
    user: req.user,
    action: 'STOCK_UPDATED',
    entityType: 'MEDICINE',
    entityId: medicine._id,
    description: `${medicine.name} stock set to ${medicine.stockQuantity}`
  });

  res.json({ success: true, message: 'Stock updated', medicine });
});

/** DELETE /api/pharmacy/medicines/:id */
const deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!medicine) throw ApiError.notFound('Medicine not found');

  if (medicine.stockQuantity > 0) {
    medicine.status = 'Discontinued';
    await medicine.save();
    return res.json({
      success: true,
      discontinued: true,
      message: `${medicine.name} still has ${medicine.stockQuantity} unit(s) in stock, so it was marked discontinued instead of deleted.`
    });
  }

  await medicine.deleteOne();
  res.json({ success: true, message: 'Medicine removed from inventory' });
});

/**
 * POST /api/pharmacy/prescriptions/:prescriptionId/dispense
 *
 * Decrements stock, records what was handed over and, optionally, raises the
 * pharmacy invoice. The whole thing runs in a transaction where the deployment
 * supports one, so a failure halfway cannot leave stock deducted for medicines
 * that were never dispensed.
 */
const dispensePrescription = asyncHandler(async (req, res) => {
  const { items, createInvoice } = req.body;

  const prescription = await Prescription.findOne({
    _id: req.params.prescriptionId,
    tenantId: req.user.tenantId
  }).populate('patientId', 'firstName lastName patientId');

  if (!prescription) throw ApiError.notFound('Prescription not found');
  if (prescription.pharmacyStatus === 'Dispensed') {
    throw ApiError.badRequest('This prescription has already been fully dispensed');
  }
  if (prescription.status === 'Cancelled') {
    throw ApiError.badRequest('This prescription was cancelled');
  }

  // Default to dispensing everything still outstanding.
  const requested =
    Array.isArray(items) && items.length
      ? items
      : prescription.medicines.map((line) => ({
          lineId: String(line._id),
          quantity: line.quantity - (line.quantityDispensed || 0)
        }));

  const result = await withTransaction(async (options) => {
    const invoiceLines = [];

    for (const entry of requested) {
      const quantity = Number(entry.quantity) || 0;
      if (quantity <= 0) continue;

      const line = prescription.medicines.id(entry.lineId);
      if (!line) throw ApiError.badRequest('One of the prescription lines does not exist');

      const outstanding = line.quantity - (line.quantityDispensed || 0);
      if (quantity > outstanding) {
        throw ApiError.badRequest(
          `Only ${outstanding} unit(s) of ${line.medicineName} are still outstanding on this prescription`
        );
      }

      const medicine = await Medicine.findOne(
        {
          tenantId: req.user.tenantId,
          $or: [
            ...(line.medicine ? [{ _id: line.medicine }] : []),
            { name: new RegExp(`^${escapeRegex(line.medicineName)}$`, 'i') }
          ]
        },
        null,
        options
      );

      if (!medicine) {
        throw ApiError.badRequest(
          `${line.medicineName} is not in the pharmacy inventory. Add it before dispensing.`
        );
      }
      if (medicine.stockQuantity < quantity) {
        throw ApiError.badRequest(
          `Insufficient stock for ${medicine.name}: ${medicine.stockQuantity} available, ${quantity} needed`
        );
      }

      medicine.stockQuantity -= quantity;
      await medicine.save(options);

      line.quantityDispensed = (line.quantityDispensed || 0) + quantity;
      if (!line.medicine) line.medicine = medicine._id;

      invoiceLines.push({
        itemName: `${medicine.name} ${medicine.dosage}`,
        itemType: 'Medicine',
        quantity,
        unitPrice: medicine.unitPrice
      });
    }

    if (invoiceLines.length === 0) {
      throw ApiError.badRequest('There is nothing left to dispense on this prescription');
    }

    const fullyDispensed = prescription.medicines.every(
      (line) => (line.quantityDispensed || 0) >= line.quantity
    );

    prescription.pharmacyStatus = fullyDispensed ? 'Dispensed' : 'Partially_Dispensed';
    prescription.dispensedBy = req.user.userId;
    prescription.dispensedAt = new Date();
    if (fullyDispensed) prescription.status = 'Completed';
    await prescription.save(options);

    let invoice = null;
    if (createInvoice !== false) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const [created] = await Billing.create(
        [
          {
            patientId: prescription.patientId._id || prescription.patientId,
            prescriptionId: prescription._id,
            dueDate,
            items: invoiceLines,
            taxPercentage: 5,
            createdBy: req.user.userId,
            notes: `Pharmacy dispensing for ${prescription.prescriptionId}`,
            tenantId: req.user.tenantId
          }
        ],
        options
      );
      invoice = created;
    }

    return { fullyDispensed, invoice, dispensedCount: invoiceLines.length };
  });

  logActivity({
    user: req.user,
    action: 'PRESCRIPTION_DISPENSED',
    entityType: 'PRESCRIPTION',
    entityId: prescription._id,
    description: `Dispensed ${result.dispensedCount} item(s) for ${prescription.prescriptionId}`
  });

  res.json({
    success: true,
    message: result.fullyDispensed
      ? 'Prescription fully dispensed'
      : 'Prescription partially dispensed',
    prescription,
    invoice: result.invoice
  });
});

module.exports = {
  addMedicine,
  getAllMedicines,
  getMedicineById,
  getLowStockMedicines,
  getExpiringMedicines,
  updateMedicine,
  updateMedicineStock,
  deleteMedicine,
  dispensePrescription
};
