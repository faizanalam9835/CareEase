/* eslint-disable no-console */
/**
 * Demo data seeder.
 *
 *   npm run seed          load demo data (keeps anything already there)
 *   npm run seed:reset    wipe the demo tenant first, then load
 *
 * Everything created belongs to the single demo tenant (TDEMO001), so running
 * this against a database that also holds real hospitals is safe.
 */

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const config = require('../config/env');

const Hospital = require('../models/Hospital');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const Billing = require('../models/Billing');
const ActivityLog = require('../models/ActivityLog');
const Ward = require('../models/Ward');
const Bed = require('../models/Bed');
const Admission = require('../models/Admission');
const Vitals = require('../models/Vitals');
const Counter = require('../models/Counter');

const { DEMO_TENANT_ID, DEMO_ACCOUNTS } = require('./demoAccounts');

const TENANT = DEMO_TENANT_ID;

/* ------------------------------- helpers -------------------------------- */

const daysFromNow = (days, hours = 9, minutes = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const yearsAgo = (years, month = 5, day = 12) =>
  new Date(new Date().getFullYear() - years, month, day);

const pick = (array, index) => array[index % array.length];

const log = (message) => console.log(`  ${message}`);

/* -------------------------------- data ---------------------------------- */

const STAFF = [
  // The five accounts the login page advertises.
  ...DEMO_ACCOUNTS.map((account) => ({
    email: account.email,
    password: account.password,
    roles: [account.role],
    department: account.department
  })),
  // Plus enough colleagues to make the lists and charts look like a real hospital.
  { email: 'r.iyer@careease.health', password: 'Doctor@123', roles: ['DOCTOR'], department: 'Orthopedics' },
  { email: 's.banerjee@careease.health', password: 'Doctor@123', roles: ['DOCTOR'], department: 'Pediatrics' },
  { email: 'n.qureshi@careease.health', password: 'Doctor@123', roles: ['DOCTOR'], department: 'Neurology' },
  { email: 'a.pillai@careease.health', password: 'Doctor@123', roles: ['DOCTOR'], department: 'Emergency' },
  { email: 'm.deshpande@careease.health', password: 'Doctor@123', roles: ['DOCTOR'], department: 'General' },
  { email: 'k.menon@careease.health', password: 'Nurse@123', roles: ['NURSE'], department: 'Emergency' },
  { email: 'p.das@careease.health', password: 'Nurse@123', roles: ['NURSE'], department: 'Pediatrics' }
];

const STAFF_PROFILES = {
  'admin@careease.health': {
    firstName: 'Ayesha', lastName: 'Khan', phone: '9810000001',
    designation: 'Hospital Administrator'
  },
  'doctor@careease.health': {
    firstName: 'Vikram', lastName: 'Mehta', phone: '9810000002',
    designation: 'Senior Consultant', specialization: 'Interventional Cardiology',
    consultationFee: 900, availableFrom: '09:00', availableTo: '17:00'
  },
  'nurse@careease.health': {
    firstName: 'Fatima', lastName: 'Sheikh', phone: '9810000003', designation: 'Staff Nurse'
  },
  'reception@careease.health': {
    firstName: 'Rohit', lastName: 'Sharma', phone: '9810000004', designation: 'Front Desk Executive'
  },
  'pharmacy@careease.health': {
    firstName: 'Neha', lastName: 'Gupta', phone: '9810000005', designation: 'Chief Pharmacist'
  },
  'r.iyer@careease.health': {
    firstName: 'Ramesh', lastName: 'Iyer', phone: '9810000006',
    designation: 'Consultant', specialization: 'Joint Replacement', consultationFee: 800
  },
  's.banerjee@careease.health': {
    firstName: 'Sujata', lastName: 'Banerjee', phone: '9810000007',
    designation: 'Consultant', specialization: 'Neonatology', consultationFee: 650
  },
  'n.qureshi@careease.health': {
    firstName: 'Nadia', lastName: 'Qureshi', phone: '9810000008',
    designation: 'Consultant', specialization: 'Epilepsy and Stroke', consultationFee: 1100
  },
  'a.pillai@careease.health': {
    firstName: 'Arjun', lastName: 'Pillai', phone: '9810000009',
    designation: 'Emergency Physician', specialization: 'Trauma Care', consultationFee: 700
  },
  'm.deshpande@careease.health': {
    firstName: 'Manoj', lastName: 'Deshpande', phone: '9810000012',
    designation: 'General Physician', specialization: 'Internal Medicine', consultationFee: 500
  },
  'k.menon@careease.health': {
    firstName: 'Kavya', lastName: 'Menon', phone: '9810000010', designation: 'Senior Nurse'
  },
  'p.das@careease.health': {
    firstName: 'Priyanka', lastName: 'Das', phone: '9810000011', designation: 'Staff Nurse'
  }
};

const PATIENTS = [
  { firstName: 'Amit', lastName: 'Sharma', gender: 'Male', age: 41, bloodGroup: 'B+', phone: '9820000001', department: 'Cardiology', patientType: 'OPD', chronicConditions: ['Hypertension'], allergies: ['Penicillin'], city: 'Mumbai' },
  { firstName: 'Priya', lastName: 'Verma', gender: 'Female', age: 35, bloodGroup: 'O+', phone: '9820000002', department: 'Cardiology', patientType: 'IPD', chronicConditions: ['Arrhythmia'], room: 'C-204', city: 'Mumbai' },
  { firstName: 'Rahul', lastName: 'Nair', gender: 'Male', age: 28, bloodGroup: 'A+', phone: '9820000003', department: 'Orthopedics', patientType: 'OPD', city: 'Pune' },
  { firstName: 'Sneha', lastName: 'Kulkarni', gender: 'Female', age: 52, bloodGroup: 'AB+', phone: '9820000004', department: 'Orthopedics', patientType: 'IPD', chronicConditions: ['Osteoarthritis'], room: 'O-101', city: 'Pune' },
  { firstName: 'Aarav', lastName: 'Joshi', gender: 'Male', age: 6, bloodGroup: 'O-', phone: '9820000005', department: 'Pediatrics', patientType: 'OPD', allergies: ['Peanuts'], city: 'Nashik' },
  { firstName: 'Diya', lastName: 'Reddy', gender: 'Female', age: 4, bloodGroup: 'B-', phone: '9820000006', department: 'Pediatrics', patientType: 'OPD', city: 'Hyderabad' },
  { firstName: 'Imran', lastName: 'Ansari', gender: 'Male', age: 63, bloodGroup: 'A-', phone: '9820000007', department: 'Neurology', patientType: 'IPD', chronicConditions: ['Type 2 Diabetes', 'Epilepsy'], room: 'N-310', city: 'Mumbai' },
  { firstName: 'Meera', lastName: 'Pillai', gender: 'Female', age: 47, bloodGroup: 'O+', phone: '9820000008', department: 'Neurology', patientType: 'OPD', city: 'Kochi' },
  { firstName: 'Karan', lastName: 'Malhotra', gender: 'Male', age: 33, bloodGroup: 'B+', phone: '9820000009', department: 'Emergency', patientType: 'IPD', room: 'E-002', city: 'Delhi' },
  { firstName: 'Ananya', lastName: 'Ghosh', gender: 'Female', age: 24, bloodGroup: 'AB-', phone: '9820000010', department: 'Emergency', patientType: 'OPD', city: 'Kolkata' },
  { firstName: 'Suresh', lastName: 'Patil', gender: 'Male', age: 58, bloodGroup: 'O+', phone: '9820000011', department: 'Cardiology', patientType: 'OPD', chronicConditions: ['Coronary artery disease'], city: 'Nagpur' },
  { firstName: 'Lakshmi', lastName: 'Rao', gender: 'Female', age: 70, bloodGroup: 'A+', phone: '9820000012', department: 'Cardiology', patientType: 'IPD', chronicConditions: ['Heart failure'], room: 'C-208', city: 'Chennai' },
  { firstName: 'Zoya', lastName: 'Siddiqui', gender: 'Female', age: 31, bloodGroup: 'B+', phone: '9820000013', department: 'General', patientType: 'OPD', city: 'Lucknow' },
  { firstName: 'Devansh', lastName: 'Trivedi', gender: 'Male', age: 45, bloodGroup: 'O-', phone: '9820000014', department: 'Orthopedics', patientType: 'OPD', city: 'Ahmedabad' },
  { firstName: 'Riya', lastName: 'Chatterjee', gender: 'Female', age: 12, bloodGroup: 'A+', phone: '9820000015', department: 'Pediatrics', patientType: 'IPD', room: 'P-004', city: 'Kolkata' },
  { firstName: 'Farhan', lastName: 'Sayyed', gender: 'Male', age: 38, bloodGroup: 'AB+', phone: '9820000016', department: 'General', patientType: 'OPD', city: 'Mumbai' },
  { firstName: 'Neelam', lastName: 'Bhatt', gender: 'Female', age: 55, bloodGroup: 'B-', phone: '9820000017', department: 'Neurology', patientType: 'OPD', chronicConditions: ['Migraine'], city: 'Surat' },
  { firstName: 'Aditya', lastName: 'Kapoor', gender: 'Male', age: 19, bloodGroup: 'O+', phone: '9820000018', department: 'Emergency', patientType: 'OPD', city: 'Delhi' }
];


const WARDS = [
  { name: 'Cardiology ICU', code: 'CICU', type: 'ICCU', department: 'Cardiology', floor: '3', dailyRate: 6500, beds: 8, prefix: 'C' },
  { name: 'Cardiology Ward', code: 'CARD', type: 'General', department: 'Cardiology', floor: '3', dailyRate: 2200, beds: 12, prefix: 'C' },
  { name: 'Orthopedics Ward', code: 'ORTH', type: 'General', department: 'Orthopedics', floor: '2', dailyRate: 2000, beds: 10, prefix: 'O' },
  { name: 'Paediatric Ward', code: 'PAED', type: 'General', department: 'Pediatrics', floor: '1', dailyRate: 1800, beds: 10, prefix: 'P' },
  { name: 'Neurology Ward', code: 'NEUR', type: 'General', department: 'Neurology', floor: '4', dailyRate: 2600, beds: 8, prefix: 'N' },
  { name: 'Emergency Observation', code: 'EOBS', type: 'Emergency', department: 'Emergency', floor: 'G', dailyRate: 1500, beds: 6, prefix: 'E' },
  { name: 'Private Rooms', code: 'PRIV', type: 'Private', department: 'General', floor: '5', dailyRate: 8500, beds: 6, prefix: 'R' }
];

const MEDICINES = [
  { name: 'Paracetamol', genericName: 'Acetaminophen', brand: 'Calpol', category: 'Tablet', dosage: '500mg', stock: 480, reorder: 100, price: 2.5, expiryMonths: 18 },
  { name: 'Amoxicillin', genericName: 'Amoxicillin trihydrate', brand: 'Mox', category: 'Capsule', dosage: '250mg', stock: 210, reorder: 60, price: 8.75, expiryMonths: 14 },
  { name: 'Atorvastatin', genericName: 'Atorvastatin calcium', brand: 'Lipitor', category: 'Tablet', dosage: '10mg', stock: 150, reorder: 40, price: 12.4, expiryMonths: 22 },
  { name: 'Metformin', genericName: 'Metformin hydrochloride', brand: 'Glycomet', category: 'Tablet', dosage: '500mg', stock: 320, reorder: 80, price: 4.2, expiryMonths: 20 },
  { name: 'Amlodipine', genericName: 'Amlodipine besylate', brand: 'Amlong', category: 'Tablet', dosage: '5mg', stock: 26, reorder: 50, price: 6.1, expiryMonths: 16 },
  { name: 'Azithromycin', genericName: 'Azithromycin dihydrate', brand: 'Azithral', category: 'Tablet', dosage: '500mg', stock: 90, reorder: 30, price: 24.0, expiryMonths: 10 },
  { name: 'Cetirizine', genericName: 'Cetirizine hydrochloride', brand: 'Cetzine', category: 'Tablet', dosage: '10mg', stock: 400, reorder: 100, price: 1.9, expiryMonths: 24 },
  { name: 'Pantoprazole', genericName: 'Pantoprazole sodium', brand: 'Pan', category: 'Tablet', dosage: '40mg', stock: 175, reorder: 50, price: 9.3, expiryMonths: 15 },
  { name: 'Insulin Glargine', genericName: 'Insulin glargine', brand: 'Lantus', category: 'Injection', dosage: '100IU/ml', stock: 18, reorder: 25, price: 780.0, expiryMonths: 8 },
  { name: 'Salbutamol', genericName: 'Salbutamol sulphate', brand: 'Asthalin', category: 'Inhaler', dosage: '100mcg', stock: 45, reorder: 20, price: 155.0, expiryMonths: 12 },
  { name: 'Ibuprofen', genericName: 'Ibuprofen', brand: 'Brufen', category: 'Tablet', dosage: '400mg', stock: 260, reorder: 70, price: 3.4, expiryMonths: 19 },
  { name: 'Ondansetron', genericName: 'Ondansetron hydrochloride', brand: 'Emeset', category: 'Injection', dosage: '2mg/ml', stock: 0, reorder: 20, price: 18.6, expiryMonths: 11 },
  { name: 'Levetiracetam', genericName: 'Levetiracetam', brand: 'Levera', category: 'Tablet', dosage: '500mg', stock: 120, reorder: 35, price: 22.5, expiryMonths: 17 },
  { name: 'Cough Syrup', genericName: 'Dextromethorphan', brand: 'Benadryl', category: 'Syrup', dosage: '100ml', stock: 72, reorder: 25, price: 118.0, expiryMonths: 9 },
  { name: 'Betamethasone', genericName: 'Betamethasone valerate', brand: 'Betnovate', category: 'Ointment', dosage: '20g', stock: 64, reorder: 20, price: 86.0, expiryMonths: 13 },
  { name: 'Moxifloxacin', genericName: 'Moxifloxacin hydrochloride', brand: 'Vigamox', category: 'Drops', dosage: '5ml', stock: 30, reorder: 15, price: 210.0, expiryMonths: 2 }
];

const REASONS = [
  'Routine follow-up', 'Chest pain evaluation', 'Post-operative review', 'Fever and body ache',
  'Knee pain assessment', 'Headache and dizziness', 'Annual health check', 'Breathlessness on exertion',
  'Vaccination schedule', 'Blood pressure review'
];

const DIAGNOSES = {
  Cardiology: ['Stable angina', 'Essential hypertension', 'Atrial fibrillation'],
  Orthopedics: ['Osteoarthritis of the knee', 'Lumbar disc prolapse', 'Rotator cuff tendinitis'],
  Pediatrics: ['Acute upper respiratory infection', 'Viral fever', 'Iron deficiency anaemia'],
  Neurology: ['Migraine without aura', 'Focal epilepsy', 'Peripheral neuropathy'],
  Emergency: ['Acute gastroenteritis', 'Soft tissue injury', 'Allergic reaction'],
  General: ['Acute pharyngitis', 'Vitamin D deficiency', 'Gastro-oesophageal reflux']
};

/* -------------------------------- seeder -------------------------------- */

const clearDemoTenant = async () => {
  log('clearing existing demo data...');
  await Promise.all([
    Vitals.deleteMany({ tenantId: TENANT }),
    Admission.deleteMany({ tenantId: TENANT }),
    Bed.deleteMany({ tenantId: TENANT }),
    Ward.deleteMany({ tenantId: TENANT }),
    Billing.deleteMany({ tenantId: TENANT }),
    Prescription.deleteMany({ tenantId: TENANT }),
    Appointment.deleteMany({ tenantId: TENANT }),
    Medicine.deleteMany({ tenantId: TENANT }),
    Patient.deleteMany({ tenantId: TENANT }),
    User.deleteMany({ tenantId: TENANT }),
    Hospital.deleteMany({ tenantId: TENANT }),
    ActivityLog.deleteMany({ tenantId: TENANT }),
    Counter.deleteMany({ _id: new RegExp(`_${TENANT}$`) })
  ]);
};

const seedHospital = async () => {
  const hospital = await Hospital.findOneAndUpdate(
    { tenantId: TENANT },
    {
      $set: {
        name: 'CareEase General Hospital',
        address: '17 Marine Lines, Churchgate',
        city: 'Mumbai',
        state: 'Maharashtra',
        contactNumber: '02224445566',
        adminEmail: 'admin@careease.health',
        licenseNumber: 'MH-HOSP-2024-0001',
        website: 'https://careease.health',
        bedCapacity: 120,
        tenantId: TENANT,
        status: 'ACTIVE',
        verifiedAt: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  log(`hospital ready: ${hospital.name} (${TENANT})`);
  return hospital;
};

const seedStaff = async () => {
  const users = [];

  for (const entry of STAFF) {
    const profile = STAFF_PROFILES[entry.email];
    const existing = await User.findOne({ tenantId: TENANT, email: entry.email });

    if (existing) {
      users.push(existing);
      continue;
    }

    // `User.create` runs the pre-save hook, so the password is hashed here.
    const user = await User.create({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: entry.email,
      professionalEmail: entry.email,
      phone: profile.phone,
      password: entry.password,
      department: entry.department,
      designation: profile.designation,
      specialization: profile.specialization,
      consultationFee: profile.consultationFee || 0,
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      availableFrom: profile.availableFrom || '09:00',
      availableTo: profile.availableTo || '17:00',
      roles: entry.roles,
      tenantId: TENANT,
      status: 'ACTIVE',
      mustChangePassword: false
    });
    users.push(user);
  }

  log(`staff ready: ${users.length} accounts`);
  return users;
};

const seedPatients = async (doctors) => {
  const existing = await Patient.countDocuments({ tenantId: TENANT });
  if (existing >= PATIENTS.length) {
    log(`patients already present: ${existing}`);
    return Patient.find({ tenantId: TENANT });
  }

  const created = [];
  for (const [index, entry] of PATIENTS.entries()) {
    const doctor = doctors.find((d) => d.department === entry.department);

    // Created one at a time so the pre-save hook allocates ids in order.
    const patient = await Patient.create({
      firstName: entry.firstName,
      lastName: entry.lastName,
      dateOfBirth: yearsAgo(entry.age, index % 12, ((index * 3) % 27) + 1),
      gender: entry.gender,
      bloodGroup: entry.bloodGroup,
      phone: entry.phone,
      email: `${entry.firstName.toLowerCase()}.${entry.lastName.toLowerCase()}@example.com`,
      address: {
        street: `${10 + index} Sector ${1 + (index % 9)}`,
        city: entry.city,
        state: 'Maharashtra',
        pincode: `4000${String(index + 1).padStart(2, '0')}`
      },
      emergencyContact: {
        name: `${entry.lastName} family`,
        relationship: index % 2 === 0 ? 'Spouse' : 'Parent',
        phone: `98299${String(10000 + index).slice(-5)}`
      },
      allergies: entry.allergies || [],
      chronicConditions: entry.chronicConditions || [],
      currentMedications: [],
      patientType: entry.patientType,
      department: entry.department,
      assignedDoctor: doctor?._id,
      admissionDate: entry.patientType === 'IPD' ? daysFromNow(-(index % 7) - 1, 11) : undefined,
      roomNumber: entry.room,
      tenantId: TENANT,
      status: 'Active'
    });
    created.push(patient);
  }

  // Spread registration dates over the past few months. Without this every
  // patient is created "today", so the dashboard's month-on-month growth
  // figure is always a meaningless +100%.
  await Promise.all(
    created.map((patient, index) => {
      // Oldest first, newest today, so the current month is never empty and
      // the month-on-month growth figure means something on any given day.
      const span = Math.max(created.length - 1, 1);
      const registeredAt = daysFromNow(-Math.round(((span - index) * 130) / span), 10, 30);
      // Mongoose treats `createdAt` as immutable, so a model-level update is
      // silently dropped. The driver collection bypasses that.
      return Patient.collection.updateOne(
        { _id: patient._id },
        { $set: { createdAt: registeredAt } }
      );
    })
  );

  log(`patients ready: ${created.length} (registration dates spread over the last ~4 months)`);
  return created;
};

const seedMedicines = async () => {
  const existing = await Medicine.countDocuments({ tenantId: TENANT });
  if (existing >= MEDICINES.length) {
    log(`medicines already present: ${existing}`);
    return Medicine.find({ tenantId: TENANT });
  }

  const created = [];
  for (const [index, entry] of MEDICINES.entries()) {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + entry.expiryMonths);

    created.push(
      await Medicine.create({
        name: entry.name,
        genericName: entry.genericName,
        brand: entry.brand,
        category: entry.category,
        dosage: entry.dosage,
        description: `${entry.genericName} - ${entry.category.toLowerCase()} form`,
        stockQuantity: entry.stock,
        reorderLevel: entry.reorder,
        unitPrice: entry.price,
        sideEffects: ['Nausea', 'Dizziness'].slice(0, (index % 2) + 1),
        storageInstructions: 'Store below 25 degrees C, away from direct sunlight',
        batchNumber: `B${2024 + (index % 2)}-${String(index + 1).padStart(3, '0')}`,
        expiryDate: expiry,
        tenantId: TENANT
      })
    );
  }

  log(`medicines ready: ${created.length} (2 deliberately low/out of stock so the alerts have something to show)`);
  return created;
};

const seedAppointments = async (patients, doctors) => {
  const existing = await Appointment.countDocuments({ tenantId: TENANT });
  if (existing > 0) {
    log(`appointments already present: ${existing}`);
    return Appointment.find({ tenantId: TENANT });
  }

  const created = [];
  // Five months of history so the revenue and appointment charts have a real
  // shape, plus today and the week ahead. Three of today's visits are already
  // completed, which keeps the current month's revenue figure non-zero even
  // when the demo is seeded on the first of the month.
  const plan = [
    ...Array.from({ length: 40 }, (_, i) => ({
      // Denser in recent weeks, thinning out towards five months ago.
      offset: -(1 + Math.round((i + 1) * (i < 20 ? 1.2 : 6))),
      status: i % 7 === 0 ? 'Cancelled' : 'Completed'
    })),
    ...Array.from({ length: 3 }, () => ({ offset: 0, status: 'Completed' })),
    ...Array.from({ length: 4 }, () => ({ offset: 0, status: 'Confirmed' })),
    ...Array.from({ length: 12 }, (_, i) => ({ offset: (i % 7) + 1, status: 'Scheduled' }))
  ];

  // Track slots per (doctor, day) so the seeded data respects the same
  // no-double-booking rule the API enforces.
  const usedSlots = new Set();

  for (const [index, entry] of plan.entries()) {
    let patient = pick(patients, index * 5 + 1);
    let doctor = doctors.find((d) => d.department === patient.department);

    // Every seeded booking respects the same rule the API enforces: the doctor
    // and the patient must be in the same department.
    if (!doctor) {
      patient = patients.find((candidate) =>
        doctors.some((d) => d.department === candidate.department)
      );
      doctor = doctors.find((d) => d.department === patient.department);
    }
    if (!doctor) continue;

    let hour = 9 + (index % 8);
    let minute = index % 2 === 0 ? 0 : 30;
    let key = `${doctor._id}-${entry.offset}-${hour}:${minute}`;
    let guard = 0;
    while (usedSlots.has(key) && guard < 20) {
      minute = minute === 0 ? 30 : 0;
      if (minute === 0) hour += 1;
      if (hour > 16) hour = 9;
      key = `${doctor._id}-${entry.offset}-${hour}:${minute}`;
      guard += 1;
    }
    usedSlots.add(key);

    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentDate: daysFromNow(entry.offset, hour, minute),
      appointmentTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      durationMinutes: 30,
      appointmentType: pick(['OPD', 'Follow-up', 'Consultation', 'Emergency'], index),
      department: patient.department,
      reason: pick(REASONS, index),
      symptoms: pick([['Fever'], ['Chest discomfort'], ['Joint pain'], ['Headache'], []], index),
      status: entry.status,
      amount: doctor.consultationFee || 500,
      paymentStatus: entry.status === 'Completed' ? 'Paid' : 'Pending',
      cancellationReason: entry.status === 'Cancelled' ? 'Patient rescheduled' : undefined,
      doctorNotes: entry.status === 'Completed' ? 'Reviewed, continue current plan.' : undefined,
      tenantId: TENANT
    });
    created.push(appointment);
  }

  log(`appointments ready: ${created.length} (past, today and upcoming)`);
  return created;
};

const seedPrescriptions = async (patients, doctors, medicines, appointments) => {
  const existing = await Prescription.countDocuments({ tenantId: TENANT });
  if (existing > 0) {
    log(`prescriptions already present: ${existing}`);
    return Prescription.find({ tenantId: TENANT });
  }

  const completed = appointments.filter((a) => a.status === 'Completed');
  const created = [];

  for (const [index, appointment] of completed.slice(0, 10).entries()) {
    const patient = patients.find((p) => String(p._id) === String(appointment.patientId));
    const doctor = doctors.find((d) => String(d._id) === String(appointment.doctorId));
    if (!patient || !doctor) continue;

    const chosen = [pick(medicines, index * 3), pick(medicines, index * 3 + 1)];

    const prescription = await Prescription.create({
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId: appointment._id,
      diagnosis: pick(DIAGNOSES[patient.department] || DIAGNOSES.General, index),
      symptoms: appointment.symptoms,
      medicines: chosen.map((medicine, i) => ({
        medicine: medicine._id,
        medicineName: medicine.name,
        dosage: medicine.dosage,
        frequency: i === 0 ? 'Twice daily' : 'Once daily',
        duration: `${5 + i * 2} days`,
        instructions: i === 0 ? 'After food' : 'At bedtime',
        quantity: (5 + i * 2) * (i === 0 ? 2 : 1)
      })),
      testsRecommended: index % 3 === 0 ? ['Complete blood count', 'Lipid profile'] : [],
      followUpDate: daysFromNow(14 + index),
      notes: 'Return sooner if symptoms worsen.',
      department: patient.department,
      // Leave several waiting at the pharmacy so that queue is not empty.
      pharmacyStatus: index < 4 ? 'Dispensed' : 'Pending',
      status: index < 4 ? 'Completed' : 'Active',
      dispensedBy: index < 4 ? doctors[0]._id : undefined,
      dispensedAt: index < 4 ? daysFromNow(-index - 1, 15) : undefined,
      tenantId: TENANT
    });

    if (index < 4) {
      // Mirror the dispensed quantities so the stock-check view is consistent.
      prescription.medicines.forEach((line) => {
        line.quantityDispensed = line.quantity;
      });
      await prescription.save();
    }

    created.push(prescription);
  }

  log(`prescriptions ready: ${created.length} (some dispensed, some waiting)`);
  return created;
};


const seedWards = async () => {
  const existing = await Ward.countDocuments({ tenantId: TENANT });
  if (existing >= WARDS.length) {
    log(`wards already present: ${existing}`);
    return { wards: await Ward.find({ tenantId: TENANT }), beds: await Bed.find({ tenantId: TENANT }) };
  }

  const wards = [];
  const beds = [];

  for (const entry of WARDS) {
    const ward = await Ward.create({
      name: entry.name,
      code: entry.code,
      type: entry.type,
      department: entry.department,
      floor: entry.floor,
      dailyRate: entry.dailyRate,
      tenantId: TENANT
    });
    wards.push(ward);

    const created = await Bed.insertMany(
      Array.from({ length: entry.beds }, (_, index) => ({
        bedNumber: `${entry.prefix}${String(index + 1).padStart(2, '0')}`,
        ward: ward._id,
        dailyRate: entry.dailyRate,
        // One bed per larger ward is out of service, so the maintenance state
        // is visible on the board rather than being a state nobody ever sees.
        status: index === entry.beds - 1 && entry.beds > 6 ? 'Maintenance' : 'Available',
        tenantId: TENANT
      }))
    );
    beds.push(...created);
  }

  log(`wards ready: ${wards.length} wards, ${beds.length} beds`);
  return { wards, beds };
};

const seedAdmissions = async (patients, doctors, staff, wards, beds) => {
  const existing = await Admission.countDocuments({ tenantId: TENANT });
  if (existing > 0) {
    log(`admissions already present: ${existing}`);
    return;
  }

  const nurse = staff.find((user) => user.roles.includes('NURSE'));
  const inpatients = patients.filter((patient) => patient.patientType === 'IPD');
  const created = [];
  // Counted per department, so two cardiology patients land in the ICU and the
  // general ward rather than both in the first ward that matched.
  const usedPerDepartment = new Map();

  for (const [index, patient] of inpatients.entries()) {
    // A department may have several wards (an ICU and a general ward, say).
    // Rotate through them so the board is not one full ward and six empty ones.
    const candidates = wards.filter((entry) => entry.department === patient.department);
    const seen = usedPerDepartment.get(patient.department) || 0;
    usedPerDepartment.set(patient.department, seen + 1);

    const ward = candidates.length
      ? candidates[seen % candidates.length]
      : wards.find((entry) => entry.department === 'General');
    if (!ward) continue;

    const bed = beds.find(
      (entry) => String(entry.ward) === String(ward._id) && entry.status === 'Available'
    );
    if (!bed) continue;

    const doctor = doctors.find((d) => d.department === patient.department);
    const admittedAt = daysFromNow(-(index + 2), 11, 15);

    const admission = await Admission.create({
      patient: patient._id,
      bed: bed._id,
      ward: ward._id,
      attendingDoctor: doctor?._id,
      department: patient.department,
      reason: pick(
        [
          'Requires continuous monitoring',
          'Post-operative care',
          'Acute episode under observation',
          'Admitted for a scheduled procedure'
        ],
        index
      ),
      diagnosis: pick(DIAGNOSES[patient.department] || DIAGNOSES.General, index),
      admittedAt,
      admittedBy: nurse?._id,
      dailyRate: bed.dailyRate,
      tenantId: TENANT
    });

    await Bed.updateOne(
      { _id: bed._id },
      { $set: { status: 'Occupied', currentAdmission: admission._id, currentPatient: patient._id } }
    );
    await Patient.updateOne(
      { _id: patient._id },
      { $set: { roomNumber: `${ward.code} / ${bed.bedNumber}`, admissionDate: admittedAt } }
    );

    // Keep the in-memory copy in step so the next iteration skips this bed.
    bed.status = 'Occupied';
    created.push(admission);
  }

  // One completed stay, so the discharge history is not empty on day one.
  const dischargedPatient = patients.find((patient) => patient.patientType === 'OPD');
  const privateWard = wards.find((ward) => ward.code === 'PRIV');
  const freeBed = beds.find(
    (bed) => String(bed.ward) === String(privateWard?._id) && bed.status === 'Available'
  );

  if (dischargedPatient && privateWard && freeBed) {
    await Admission.create({
      patient: dischargedPatient._id,
      bed: freeBed._id,
      ward: privateWard._id,
      department: dischargedPatient.department,
      reason: 'Day procedure',
      admittedAt: daysFromNow(-12, 9, 0),
      admittedBy: nurse?._id,
      dischargedAt: daysFromNow(-9, 16, 0),
      dischargedBy: nurse?._id,
      dischargeSummary:
        'Recovered well. Discharged on oral medication with a follow-up in two weeks.',
      dailyRate: freeBed.dailyRate,
      status: 'Discharged',
      tenantId: TENANT
    });
  }

  log(`admissions ready: ${created.length} current inpatients, 1 discharged stay`);
};

const seedVitals = async (patients, staff) => {
  const existing = await Vitals.countDocuments({ tenantId: TENANT });
  if (existing > 0) {
    log(`vitals already present: ${existing}`);
    return;
  }

  const nurses = staff.filter((user) => user.roles.includes('NURSE'));
  const inpatients = patients.filter((patient) => patient.patientType === 'IPD');
  const rows = [];

  for (const [patientIndex, patient] of inpatients.entries()) {
    // A short series per inpatient, so the trend chart has a line to draw.
    for (let reading = 0; reading < 6; reading += 1) {
      const drift = (patientIndex + reading) % 5;
      // The first inpatient runs hypertensive and febrile, so the abnormal and
      // critical flags have something real to highlight.
      const unwell = patientIndex === 0;

      rows.push({
        patient: patient._id,
        recordedAt: daysFromNow(-(5 - reading), 7 + reading * 3, 0),
        recordedBy: pick(nurses, patientIndex + reading)?._id,
        temperature: Number((36.4 + drift * 0.2 + (unwell ? 1.5 : 0)).toFixed(1)),
        pulse: 68 + drift * 4 + (unwell ? 28 : 0),
        systolic: 112 + drift * 3 + (unwell ? 36 : 0),
        diastolic: 72 + drift * 2 + (unwell ? 20 : 0),
        respiratoryRate: 14 + (drift % 3),
        oxygenSaturation: 98 - drift - (unwell ? 4 : 0),
        bloodSugar: 96 + drift * 6,
        weight: 58 + patientIndex * 3,
        height: 158 + patientIndex * 2,
        painScore: unwell ? 6 : drift,
        notes: reading === 0 ? 'Baseline observations on admission.' : undefined,
        tenantId: TENANT
      });
    }
  }

  if (rows.length) await Vitals.insertMany(rows);
  log(`vitals ready: ${rows.length} readings across ${inpatients.length} inpatients`);
};

const seedInvoices = async (patients, appointments, prescriptions, staff) => {
  const existing = await Billing.countDocuments({ tenantId: TENANT });
  if (existing > 0) {
    log(`invoices already present: ${existing}`);
    return;
  }

  const receptionist = staff.find((user) => user.roles.includes('RECEPTIONIST'));
  const created = [];

  // Consultation invoices for completed visits - most paid, a few outstanding.
  for (const [index, appointment] of appointments.filter((a) => a.status === 'Completed').entries()) {
    const dueDate = new Date(appointment.appointmentDate);
    dueDate.setDate(dueDate.getDate() + 7);

    const invoice = await Billing.create({
      patientId: appointment.patientId,
      appointmentId: appointment._id,
      invoiceDate: appointment.appointmentDate,
      dueDate,
      items: [
        {
          itemName: 'Specialist consultation',
          itemType: 'Consultation',
          quantity: 1,
          unitPrice: appointment.amount || 500
        },
        ...(index % 3 === 0
          ? [{ itemName: 'ECG', itemType: 'Test', quantity: 1, unitPrice: 350 }]
          : [])
      ],
      taxPercentage: 5,
      discount: index % 5 === 0 ? 100 : 0,
      paymentMethod: pick(['Cash', 'Card', 'UPI', 'Insurance'], index),
      createdBy: receptionist?._id,
      tenantId: TENANT
    });

    // index % 4 === 3 stays unpaid, index % 4 === 2 is part paid.
    if (index % 4 !== 3) {
      const share = index % 4 === 2 ? 0.5 : 1;
      invoice.payments.push({
        amount: Number((invoice.totalAmount * share).toFixed(2)),
        method: invoice.paymentMethod,
        transactionId: `TXN${Date.now()}${index}`,
        paidAt: appointment.appointmentDate,
        recordedBy: receptionist?._id
      });
      await invoice.save();
    }

    created.push(invoice);
  }

  // Pharmacy invoices for the prescriptions that were dispensed.
  for (const [index, prescription] of prescriptions.filter((p) => p.pharmacyStatus === 'Dispensed').entries()) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const invoice = await Billing.create({
      patientId: prescription.patientId,
      prescriptionId: prescription._id,
      invoiceDate: prescription.dispensedAt || new Date(),
      dueDate,
      items: prescription.medicines.map((line) => ({
        itemName: `${line.medicineName} ${line.dosage}`,
        itemType: 'Medicine',
        quantity: line.quantity,
        unitPrice: 12.5
      })),
      taxPercentage: 5,
      paymentMethod: 'UPI',
      notes: `Pharmacy dispensing for ${prescription.prescriptionId}`,
      createdBy: receptionist?._id,
      tenantId: TENANT
    });

    if (index % 3 !== 2) {
      invoice.payments.push({
        amount: invoice.totalAmount,
        method: 'UPI',
        paidAt: invoice.invoiceDate,
        recordedBy: receptionist?._id
      });
      await invoice.save();
    }

    created.push(invoice);
  }

  const paid = created.filter((i) => i.paymentStatus === 'Paid').length;
  log(`invoices ready: ${created.length} (${paid} settled, ${created.length - paid} with a balance)`);
};

const seedActivity = async (staff) => {
  const existing = await ActivityLog.countDocuments({ tenantId: TENANT });
  if (existing > 0) return;

  const admin = staff.find((user) => user.roles.includes('HOSPITAL_ADMIN'));
  const entries = [
    'Demo data loaded for CareEase General Hospital',
    'Pharmacy inventory imported',
    'Staff roster created',
    'Patient records imported',
    'Appointment schedule generated'
  ];

  await ActivityLog.insertMany(
    entries.map((description, index) => ({
      tenantId: TENANT,
      actorId: admin?._id,
      actorName: admin ? `${admin.firstName} ${admin.lastName}` : 'System',
      actorRole: 'HOSPITAL_ADMIN',
      action: 'SEED',
      entityType: 'HOSPITAL',
      description,
      createdAt: new Date(Date.now() - index * 60000)
    }))
  );
};

const printCredentials = () => {
  console.log('');
  console.log('  Sign in at the login page with any of these:');
  console.log('  ---------------------------------------------------------------');
  console.log(`  Hospital ID (all accounts): ${TENANT}`);
  console.log('');
  for (const account of DEMO_ACCOUNTS) {
    console.log(`  ${account.role.padEnd(16)} ${account.email.padEnd(30)} ${account.password}`);
  }
  console.log('  ---------------------------------------------------------------');
  console.log('  The login page also lists these, one click fills the form.');
  console.log('');
};

const run = async () => {
  const reset = process.argv.includes('--reset');

  console.log('');
  console.log('  CareEase demo seeder');
  console.log(`  database: ${config.mongoUri.replace(/\/\/[^@]*@/, '//***@')}`);
  console.log('');

  await connectDB();

  if (reset) await clearDemoTenant();

  await seedHospital();
  const staff = await seedStaff();
  const doctors = staff.filter((user) => user.roles.includes('DOCTOR'));

  const patients = await seedPatients(doctors);
  const medicines = await seedMedicines();
  const { wards, beds } = await seedWards();
  const appointments = await seedAppointments(patients, doctors);
  const prescriptions = await seedPrescriptions(patients, doctors, medicines, appointments);
  await seedInvoices(patients, appointments, prescriptions, staff);
  await seedAdmissions(patients, doctors, staff, wards, beds);
  await seedVitals(patients, staff);
  await seedActivity(staff);

  printCredentials();

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (error) => {
  console.error('\n  seeding failed:', error.message);
  console.error(error.stack);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
