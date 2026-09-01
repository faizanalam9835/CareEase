// Single source of truth for the enumerations shared by models, seed data,
// validation and the API responses the frontend renders its dropdowns from.

const ROLES = ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST'];

const DEPARTMENTS = [
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Gynecology',
  'Neurology',
  'Dermatology',
  'Oncology',
  'Emergency',
  'Pharmacy',
  'Administration',
  'General'
];

// Departments that carry patients. Administration/Pharmacy staff are not
// clinical, so they are excluded from patient-facing department pickers.
const CLINICAL_DEPARTMENTS = DEPARTMENTS.filter(
  (d) => !['Administration', 'Pharmacy'].includes(d)
);

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const GENDERS = ['Male', 'Female', 'Other'];

const PATIENT_TYPES = ['OPD', 'IPD'];
const PATIENT_STATUSES = ['Active', 'Inactive', 'Discharged', 'Deceased'];

const APPOINTMENT_TYPES = ['OPD', 'Follow-up', 'Consultation', 'Emergency'];
const APPOINTMENT_STATUSES = [
  'Scheduled',
  'Confirmed',
  'In Progress',
  'Completed',
  'Cancelled',
  'No Show'
];

const MEDICINE_CATEGORIES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Ointment',
  'Drops',
  'Inhaler',
  'Other'
];

const INVOICE_ITEM_TYPES = ['Consultation', 'Medicine', 'Test', 'Procedure', 'Room', 'Other'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Partially_Paid', 'Cancelled', 'Refunded'];
const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Net Banking', 'Insurance', 'Other'];

const WARD_TYPES = ['General', 'Semi-Private', 'Private', 'ICU', 'ICCU', 'NICU', 'Emergency', 'Maternity'];
const BED_STATUSES = ['Available', 'Occupied', 'Reserved', 'Maintenance'];
const ADMISSION_STATUSES = ['Active', 'Discharged', 'Transferred Out'];

const PRESCRIPTION_STATUSES = ['Active', 'Completed', 'Cancelled'];
const PHARMACY_STATUSES = ['Pending', 'Dispensed', 'Partially_Dispensed', 'Cancelled'];

// Roles that are allowed to see every department's data.
const CROSS_DEPARTMENT_ROLES = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'PHARMACIST'];

module.exports = {
  ROLES,
  DEPARTMENTS,
  CLINICAL_DEPARTMENTS,
  BLOOD_GROUPS,
  GENDERS,
  PATIENT_TYPES,
  PATIENT_STATUSES,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  MEDICINE_CATEGORIES,
  INVOICE_ITEM_TYPES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  PRESCRIPTION_STATUSES,
  PHARMACY_STATUSES,
  WARD_TYPES,
  BED_STATUSES,
  ADMISSION_STATUSES,
  CROSS_DEPARTMENT_ROLES
};
