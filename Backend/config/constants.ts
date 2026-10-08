// Single source of truth for the enumerations shared by models, seed data,
// validation and the API responses the frontend renders its dropdowns from.

const ROLES = ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST'] as const;

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
] as const;

// Departments that carry patients. Administration/Pharmacy staff are not
// clinical, so they are excluded from patient-facing department pickers.
const CLINICAL_DEPARTMENTS: Department[] = DEPARTMENTS.filter(
  (d) => !['Administration', 'Pharmacy'].includes(d)
);

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] as const;

const GENDERS = ['Male', 'Female', 'Other'] as const;

const PATIENT_TYPES = ['OPD', 'IPD'] as const;
const PATIENT_STATUSES = ['Active', 'Inactive', 'Discharged', 'Deceased'] as const;

const APPOINTMENT_TYPES = ['OPD', 'Follow-up', 'Consultation', 'Emergency'] as const;
const APPOINTMENT_STATUSES = [
  'Scheduled',
  'Confirmed',
  'In Progress',
  'Completed',
  'Cancelled',
  'No Show'
] as const;

const MEDICINE_CATEGORIES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Ointment',
  'Drops',
  'Inhaler',
  'Other'
] as const;

const INVOICE_ITEM_TYPES = ['Consultation', 'Medicine', 'Test', 'Procedure', 'Room', 'Other'] as const;
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Partially_Paid', 'Cancelled', 'Refunded'] as const;
const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Net Banking', 'Insurance', 'Other'] as const;

const WARD_TYPES = ['General', 'Semi-Private', 'Private', 'ICU', 'ICCU', 'NICU', 'Emergency', 'Maternity'] as const;
const BED_STATUSES = ['Available', 'Occupied', 'Reserved', 'Maintenance'] as const;
const ADMISSION_STATUSES = ['Active', 'Discharged', 'Transferred Out'] as const;

const PRESCRIPTION_STATUSES = ['Active', 'Completed', 'Cancelled'] as const;
const PHARMACY_STATUSES = ['Pending', 'Dispensed', 'Partially_Dispensed', 'Cancelled'] as const;

// Roles that are allowed to see every department's data.
const CROSS_DEPARTMENT_ROLES: readonly Role[] = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'PHARMACIST'];

export {
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

export type Role = (typeof ROLES)[number];
export type Department = (typeof DEPARTMENTS)[number];
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export type Gender = (typeof GENDERS)[number];
export type PatientType = (typeof PATIENT_TYPES)[number];
export type PatientStatus = (typeof PATIENT_STATUSES)[number];
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type MedicineCategory = (typeof MEDICINE_CATEGORIES)[number];
export type InvoiceItemType = (typeof INVOICE_ITEM_TYPES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type WardType = (typeof WARD_TYPES)[number];
export type BedStatus = (typeof BED_STATUSES)[number];
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];
export type PharmacyStatus = (typeof PHARMACY_STATUSES)[number];
