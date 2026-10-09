/**
 * Shapes of the payloads the CareEase API sends and accepts.
 *
 * Mirrors Backend/models/* and Backend/controllers/*. Dates arrive as ISO
 * strings (JSON has no Date), ObjectIds as strings. A reference the server may
 * or may not have populated is typed `Ref<T>`; narrow it with `isPopulated`.
 */

/* ------------------------------ enumerations ------------------------------ */
// Backend/config/constants.ts

export type Role = 'HOSPITAL_ADMIN' | 'DOCTOR' | 'NURSE' | 'PHARMACIST' | 'RECEPTIONIST' | 'SUPER_ADMIN';

export type Department =
  | 'Cardiology'
  | 'Orthopedics'
  | 'Pediatrics'
  | 'Gynecology'
  | 'Neurology'
  | 'Dermatology'
  | 'Oncology'
  | 'Emergency'
  | 'Pharmacy'
  | 'Administration'
  | 'General';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
export type Gender = 'Male' | 'Female' | 'Other';
export type PatientType = 'OPD' | 'IPD';
export type PatientStatus = 'Active' | 'Inactive' | 'Discharged' | 'Deceased';
export type AppointmentType = 'OPD' | 'Follow-up' | 'Consultation' | 'Emergency';
export type AppointmentStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';
export type MedicineCategory =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Injection'
  | 'Ointment'
  | 'Drops'
  | 'Inhaler'
  | 'Other';
export type MedicineStatus = 'Active' | 'Discontinued' | 'Out_of_Stock';
export type InvoiceItemType = 'Consultation' | 'Medicine' | 'Test' | 'Procedure' | 'Room' | 'Other';
export type PaymentStatus = 'Pending' | 'Paid' | 'Partially_Paid' | 'Cancelled' | 'Refunded';
export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Net Banking' | 'Insurance' | 'Other';
export type InvoiceStatus = 'Active' | 'Cancelled' | 'Refunded';
export type PrescriptionStatus = 'Active' | 'Completed' | 'Cancelled';
export type PharmacyStatus = 'Pending' | 'Dispensed' | 'Partially_Dispensed' | 'Cancelled';
export type WardType =
  | 'General'
  | 'Semi-Private'
  | 'Private'
  | 'ICU'
  | 'ICCU'
  | 'NICU'
  | 'Emergency'
  | 'Maternity';
export type WardStatus = 'Active' | 'Closed';
export type BedStatus = 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
export type AdmissionStatus = 'Active' | 'Discharged' | 'Transferred Out';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
export type HospitalStatus = 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

/** The enumerations served by GET /api/meta (see hooks/useMeta). */
export interface Meta {
  roles: Role[];
  departments: Department[];
  clinicalDepartments: Department[];
  bloodGroups: BloodGroup[];
  genders: Gender[];
  patientTypes: PatientType[];
  patientStatuses: PatientStatus[];
  appointmentTypes: AppointmentType[];
  appointmentStatuses: AppointmentStatus[];
  medicineCategories: MedicineCategory[];
  invoiceItemTypes: InvoiceItemType[];
  paymentStatuses: PaymentStatus[];
  paymentMethods: PaymentMethod[];
  prescriptionStatuses: PrescriptionStatus[];
  pharmacyStatuses: PharmacyStatus[];
  wardTypes: WardType[];
  bedStatuses: BedStatus[];
  admissionStatuses?: AdmissionStatus[];
}

/* -------------------------------- helpers -------------------------------- */

/** A Mongo ObjectId as it appears in JSON. */
export type Id = string;
/** An ISO-8601 date string. */
export type ISODate = string;

export interface Timestamps {
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

/** A document the server populated with only some of its fields. */
export type Populated<T extends { _id: Id }, K extends keyof T = never> = Pick<T, '_id' | K> &
  Partial<T>;

/**
 * A reference: the bare id, or the document when the endpoint populated it.
 * `null` when the referenced document has since been deleted.
 */
export type Ref<T> = Id | T | null;

export const isPopulated = <T extends object>(ref: Ref<T> | undefined): ref is T =>
  typeof ref === 'object' && ref !== null;

/** The id behind a reference, whether or not it was populated. */
export const refId = <T extends { _id: Id }>(ref: Ref<T> | undefined): Id | undefined =>
  isPopulated(ref) ? ref._id : (ref ?? undefined);

/** Numbers typed into a form arrive as strings; the API casts them. */
export type Numeric = number | string;

/* ------------------------------- envelopes ------------------------------- */

/** Every successful response: `{ success, message?, ...payload }`. */
export type ApiResponse<T extends object = object> = {
  success: boolean;
  message?: string;
} & T;

/** Backend/utils/pagination.ts `buildMeta`. */
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * A paginated list. `T` carries the resource-specific key (`patients`,
 * `invoices`…); several lists also repeat the numbers as legacy top-level
 * fields, hence the optional `currentPage`/`totalPages`.
 */
export type Paginated<T extends object> = ApiResponse<
  T & { meta: PageMeta; currentPage?: number; totalPages?: number }
>;

/** Error body the API sends (middleware/errorHandler.ts). */
export interface ApiErrorBody {
  success: false;
  error: string;
  message?: string;
  details?: Record<string, string>;
  stack?: string;
}

export interface PageParams {
  page?: number;
  limit?: number;
}

/* --------------------------------- users --------------------------------- */

export interface User extends Timestamps {
  _id: Id;
  id?: Id;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  professionalEmail?: string;
  phone: string;
  mustChangePassword?: boolean;
  lastLoginAt?: ISODate;
  department: Department;
  designation?: string;
  specialization?: string;
  consultationFee?: number;
  availableDays?: string[];
  availableFrom?: string;
  availableTo?: string;
  roles: Role[];
  tenantId: string;
  status: UserStatus;
}

export type UserRef = Populated<User, 'firstName' | 'lastName'>;

/** The signed-in user, as /auth/login and /auth/me send it (`publicUser`). */
export interface AuthUser {
  id: Id;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  professionalEmail?: string;
  phone: string;
  department: Department;
  designation?: string;
  specialization?: string;
  roles: Role[];
  tenantId: string;
  status: UserStatus;
  mustChangePassword?: boolean;
  lastLoginAt?: ISODate;
  hospitalName?: string;
  createdAt?: ISODate;
}

export interface LoginCredentials {
  email: string;
  password: string;
  /** Only sent when the same account exists at several hospitals and the user picked one. */
  tenantId?: string;
}

/** 409 CHOOSE_HOSPITAL body from /auth/login. */
export interface HospitalChoice {
  tenantId: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
  expiresIn?: string | number;
}

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  professionalEmail?: string;
  designation?: string;
  specialization?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface DemoAccount {
  role: Role;
  label: string;
  email: string;
  password: string;
  department: Department;
  description: string;
  tenantId: string;
  available: boolean;
}

export interface DemoCredentials {
  demoMode: boolean;
  seeded?: boolean;
  tenantId: string | null;
  hospitalName?: string;
  hint?: string;
  accounts: DemoAccount[];
}

export interface StaffInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  professionalEmail?: string;
  phone?: string;
  password?: string;
  department?: Department | '';
  designation?: string;
  specialization?: string;
  consultationFee?: Numeric;
  roles?: Role[];
  status?: UserStatus;
  availableDays?: string[];
  availableFrom?: string;
  availableTo?: string;
}

export interface UserListParams extends PageParams {
  search?: string;
  role?: Role | string;
  department?: Department | string;
  status?: UserStatus | string;
}

/* ------------------------------- hospitals ------------------------------- */

export interface Hospital extends Timestamps {
  _id: Id;
  name: string;
  address: string;
  city?: string;
  state?: string;
  contactNumber: string;
  adminEmail: string;
  licenseNumber: string;
  website?: string;
  bedCapacity: number;
  tenantId: string;
  status: HospitalStatus;
  verifiedAt?: ISODate;
}

export interface TenantInput {
  name: string;
  address: string;
  city?: string;
  state?: string;
  contactNumber: string;
  adminEmail: string;
  licenseNumber: string;
  website?: string;
  bedCapacity?: Numeric;
}

export type HospitalUpdateInput = Partial<
  Pick<TenantInput, 'name' | 'address' | 'city' | 'state' | 'contactNumber' | 'website' | 'bedCapacity'>
>;

export interface Tenant extends Hospital {
  staffCount: number;
  patientCount: number;
  appointmentCount: number;
}

export interface CreateTenantInput extends TenantInput {
  adminFirstName?: string;
  adminLastName?: string;
}

export interface CreateTenantResponse {
  tenant: Hospital;
  admin: { id: Id; email: string; temporaryPassword: string };
  emailSent: boolean;
}

/* -------------------------------- patients ------------------------------- */

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface Patient extends Timestamps {
  _id: Id;
  id?: Id;
  patientId: string;
  firstName: string;
  lastName: string;
  /** Virtual. */
  fullName?: string;
  /** Virtual; null without a date of birth. */
  age?: number | null;
  dateOfBirth: ISODate;
  gender: Gender;
  bloodGroup: BloodGroup;
  phone: string;
  email?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  patientType: PatientType;
  department: Department;
  assignedDoctor?: Ref<UserRef>;
  admissionDate?: ISODate;
  dischargeDate?: ISODate;
  roomNumber?: string;
  notes?: string;
  tenantId: string;
  status: PatientStatus;
}

export type PatientRef = Populated<Patient, 'firstName' | 'lastName'>;

export interface PatientInput {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender | '';
  bloodGroup?: BloodGroup | '';
  phone?: string;
  email?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  patientType?: PatientType;
  department?: Department | '';
  assignedDoctor?: Id;
  status?: PatientStatus;
  roomNumber?: string;
  admissionDate?: string;
  dischargeDate?: string;
  notes?: string;
}

export interface PatientListParams extends PageParams {
  search?: string;
  patientType?: PatientType | 'All' | string;
  department?: Department | 'All' | string;
  status?: PatientStatus | 'All' | string;
  bloodGroup?: BloodGroup | 'All' | string;
  sort?: 'newest' | 'oldest' | 'name' | string;
}

export interface PatientStats {
  total: number;
  opd: number;
  ipd: number;
  active: number;
}

/* ------------------------------ appointments ----------------------------- */

export interface Appointment extends Timestamps {
  _id: Id;
  appointmentId: string;
  patientId: Ref<PatientRef>;
  doctorId: Ref<UserRef>;
  appointmentDate: ISODate;
  appointmentTime: string;
  durationMinutes?: number;
  appointmentType: AppointmentType;
  department: Department;
  reason: string;
  symptoms?: string[];
  status: AppointmentStatus;
  paymentStatus?: 'Pending' | 'Paid' | 'Refunded';
  amount?: number;
  doctorNotes?: string;
  cancellationReason?: string;
  source?: 'Staff' | 'Voice';
  tenantId: string;
}

export type AppointmentRef = Populated<Appointment, 'appointmentId'>;

export interface AppointmentInput {
  patientId?: Id;
  doctorId?: Id;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentType?: AppointmentType;
  reason?: string;
  symptoms?: string[];
  durationMinutes?: Numeric;
  amount?: Numeric;
  status?: AppointmentStatus;
  doctorNotes?: string;
  cancellationReason?: string;
}

export interface AppointmentStatusInput {
  status: AppointmentStatus;
  doctorNotes?: string;
  cancellationReason?: string;
}

export interface AppointmentListParams extends PageParams {
  status?: AppointmentStatus | 'All' | string;
  department?: Department | 'All' | string;
  date?: string;
  from?: string;
  to?: string;
  doctorId?: Id;
  patientId?: Id;
  search?: string;
}

export interface AvailabilitySlot {
  time: string;
  available: boolean;
}

export interface DoctorAvailability {
  doctor: { id: Id; name: string; department: Department };
  date: string;
  slots: AvailabilitySlot[];
}

/* ------------------------------ prescriptions ---------------------------- */

export interface PrescribedMedicine {
  _id?: Id;
  /** Inventory link; free-text medicines leave it empty. */
  medicine?: Id;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
  quantityDispensed?: number;
}

export interface Prescription extends Timestamps {
  _id: Id;
  prescriptionId: string;
  patientId: Ref<PatientRef>;
  doctorId: Ref<UserRef>;
  appointmentId?: Ref<AppointmentRef>;
  diagnosis: string;
  symptoms?: string[];
  medicines: PrescribedMedicine[];
  testsRecommended?: string[];
  followUpDate?: ISODate;
  notes?: string;
  department?: Department;
  status: PrescriptionStatus;
  pharmacyStatus: PharmacyStatus;
  dispensedAt?: ISODate;
  dispensedBy?: Ref<UserRef>;
  tenantId: string;
}

export type PrescriptionRef = Populated<Prescription, 'prescriptionId'>;

export interface PrescribedMedicineInput {
  medicine?: Id;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: Numeric;
}

export interface PrescriptionInput {
  patientId?: Id;
  appointmentId?: Id;
  diagnosis?: string;
  symptoms?: string[];
  medicines?: PrescribedMedicineInput[];
  testsRecommended?: string[];
  followUpDate?: string;
  notes?: string;
  status?: PrescriptionStatus;
}

export interface PrescriptionStatusInput {
  status?: PrescriptionStatus;
  pharmacyStatus?: PharmacyStatus;
}

export interface PrescriptionListParams extends PageParams {
  status?: PrescriptionStatus | 'All' | string;
  pharmacyStatus?: PharmacyStatus | 'All' | string;
  search?: string;
  patientId?: Id;
  doctorId?: Id;
}

export interface StockCheckLine {
  lineId: Id;
  medicineName: string;
  required: number;
  inStock: number;
  unitPrice: number;
  medicineId?: Id;
  inInventory: boolean;
  sufficient: boolean;
}

export interface StockCheck {
  prescriptionId: string;
  canDispenseFully: boolean;
  lines: StockCheckLine[];
}

/* -------------------------------- pharmacy ------------------------------- */

export interface Medicine extends Timestamps {
  _id: Id;
  id?: Id;
  medicineId: string;
  name: string;
  genericName: string;
  brand: string;
  category: MedicineCategory;
  dosage: string;
  description?: string;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
  sideEffects?: string[];
  contraindications?: string[];
  storageInstructions?: string;
  batchNumber?: string;
  expiryDate?: ISODate;
  tenantId: string;
  status: MedicineStatus;
  /** Virtuals. */
  isLowStock?: boolean;
  isExpired?: boolean;
  stockValue?: number;
}

export interface MedicineInput {
  name?: string;
  genericName?: string;
  brand?: string;
  category?: MedicineCategory | '';
  dosage?: string;
  description?: string;
  stockQuantity?: Numeric;
  reorderLevel?: Numeric;
  unitPrice?: Numeric;
  sideEffects?: string[];
  contraindications?: string[];
  storageInstructions?: string;
  batchNumber?: string;
  expiryDate?: string;
  status?: MedicineStatus;
}

export interface StockUpdateInput {
  stockQuantity?: Numeric;
  /** 'add'/'remove' apply a delta; anything else sets the absolute value. */
  mode?: 'add' | 'remove' | 'set';
  unitPrice?: Numeric;
  reorderLevel?: Numeric;
  status?: MedicineStatus;
  batchNumber?: string;
  expiryDate?: string;
}

export interface DispenseInput {
  items?: { lineId: Id; quantity: Numeric }[];
  createInvoice?: boolean;
}

export interface MedicineListParams extends PageParams {
  search?: string;
  category?: MedicineCategory | 'All' | string;
  status?: MedicineStatus | 'All' | string;
  lowStock?: boolean | string;
  expiringSoon?: boolean | string;
}

export interface PharmacyStats {
  totalItems: number;
  outOfStock: number;
  lowStock: number;
  stockValue: number;
  expiringSoon: number;
}

/* -------------------------------- billing -------------------------------- */

export interface InvoiceItem {
  _id?: Id;
  itemName: string;
  itemType: InvoiceItemType;
  quantity: number;
  unitPrice: number;
  amount?: number;
}

export interface Payment {
  _id: Id;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  paidAt: ISODate;
  recordedBy?: Id;
}

export interface Invoice extends Timestamps {
  _id: Id;
  invoiceId: string;
  patientId: Ref<PatientRef>;
  appointmentId?: Ref<AppointmentRef>;
  prescriptionId?: Ref<PrescriptionRef>;
  invoiceDate: ISODate;
  dueDate: ISODate;
  items: InvoiceItem[];
  subTotal: number;
  taxPercentage: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  payments?: Payment[];
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: ISODate;
  transactionId?: string;
  insuranceProvider?: string;
  insuranceClaimAmount?: number;
  notes?: string;
  createdBy?: Ref<UserRef>;
  tenantId: string;
  status: InvoiceStatus;
}

/** The backend model is called Billing. */
export type Billing = Invoice;

export interface InvoiceItemInput {
  itemName: string;
  itemType?: InvoiceItemType;
  quantity?: Numeric;
  unitPrice: Numeric;
}

export interface InvoiceInput {
  patientId?: Id;
  appointmentId?: Id;
  prescriptionId?: Id;
  items?: InvoiceItemInput[];
  discount?: Numeric;
  taxPercentage?: Numeric;
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  insuranceProvider?: string;
  insuranceClaimAmount?: Numeric;
  notes?: string;
}

export interface PaymentInput {
  amount: Numeric;
  method?: PaymentMethod;
  transactionId?: string;
}

export interface InvoiceListParams extends PageParams {
  paymentStatus?: PaymentStatus | 'All' | string;
  search?: string;
  from?: string;
  to?: string;
  patientId?: Id;
}

export interface InvoiceStats {
  count: number;
  invoiced: number;
  collected: number;
  outstanding: number;
}

export interface FinancialDashboard {
  totalInvoiced: number;
  totalRevenue: number;
  pendingPayments: number;
  monthlyRevenue: number;
  monthlyInvoiced: number;
  yearlyRevenue: number;
  collectionRate: number;
  invoiceStats: { status: PaymentStatus; count: number; amount: number }[];
  revenueTrend: { label: string; invoiced: number; collected: number; invoices: number }[];
  revenueByCategory: { category: InvoiceItemType; amount: number; count: number }[];
  topDebtors: { name: string; patientCode?: string; outstanding: number; invoices: number }[];
}

/* ---------------------------- wards and beds ----------------------------- */

export interface Ward extends Timestamps {
  _id: Id;
  id?: Id;
  name: string;
  code: string;
  type: WardType;
  department: Department;
  floor?: string;
  dailyRate: number;
  notes?: string;
  tenantId: string;
  status: WardStatus;
}

export type WardRef = Populated<Ward, 'name' | 'code'>;

export interface BedCounts extends Record<BedStatus, number> {
  total: number;
}

/** A ward as GET /api/wards lists it, with live bed counts. */
export interface WardSummary extends Ward {
  bedCounts: BedCounts;
  occupancyRate: number;
}

export interface WardTotals {
  beds: number;
  occupied: number;
  available: number;
  outOfService: number;
  occupancyRate: number;
}

export interface Bed extends Timestamps {
  _id: Id;
  id?: Id;
  bedNumber: string;
  ward: Ref<WardRef>;
  status: BedStatus;
  currentAdmission?: Ref<AdmissionRef>;
  currentPatient?: Ref<PatientRef>;
  dailyRate: number;
  notes?: string;
  isFree?: boolean;
  tenantId: string;
}

export type BedRef = Populated<Bed, 'bedNumber'>;

/** GET /api/beds/available - the admit/transfer picker. */
export interface AvailableBed {
  _id: Id;
  bedNumber: string;
  label: string;
  ward: WardRef;
  dailyRate: number;
}

export interface WardInput {
  name?: string;
  code?: string;
  type?: WardType;
  department?: Department;
  floor?: string;
  dailyRate?: Numeric;
  notes?: string;
  status?: WardStatus;
  /** Create only: beds to add up front. */
  bedCount?: Numeric;
  bedPrefix?: string;
}

export interface BedInput {
  bedNumber?: string;
  dailyRate?: Numeric;
  status?: BedStatus;
  notes?: string;
}

export interface Transfer {
  _id?: Id;
  fromBed?: Id;
  fromLabel?: string;
  toBed?: Id;
  toLabel?: string;
  reason?: string;
  movedAt?: ISODate;
  movedBy?: Id;
}

export interface Admission extends Timestamps {
  _id: Id;
  id?: Id;
  admissionId: string;
  patient: Ref<PatientRef>;
  bed: Ref<BedRef>;
  ward: Ref<WardRef>;
  attendingDoctor?: Ref<UserRef>;
  department?: Department;
  reason: string;
  diagnosis?: string;
  notes?: string;
  admittedAt: ISODate;
  admittedBy?: Ref<UserRef>;
  dischargedAt?: ISODate;
  dischargedBy?: Ref<UserRef>;
  dischargeSummary?: string;
  dailyRate: number;
  transfers?: Transfer[];
  tenantId: string;
  status: AdmissionStatus;
  /** Virtuals. */
  lengthOfStayDays?: number;
  roomCharges?: number;
}

export type AdmissionRef = Populated<Admission, 'admissionId'>;

export interface AdmitInput {
  patientId?: Id;
  bedId?: Id;
  reason?: string;
  diagnosis?: string;
  attendingDoctor?: Id;
  notes?: string;
}

export interface TransferInput {
  bedId: Id;
  reason?: string;
}

export interface AdmissionDischargeInput {
  dischargeSummary?: string;
  createInvoice?: boolean;
}

export interface AdmissionListParams extends PageParams {
  status?: AdmissionStatus | 'All' | string;
  patient?: Id;
}

/* --------------------------------- vitals -------------------------------- */

export type VitalField =
  | 'temperature'
  | 'pulse'
  | 'systolic'
  | 'diastolic'
  | 'respiratoryRate'
  | 'oxygenSaturation'
  | 'bloodSugar';

export type VitalLevel = 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high';

export interface VitalFlag {
  level: VitalLevel;
  value: number;
  unit: string;
  label: string;
  normalRange: string;
}

export interface VitalsAssessment {
  flags: Partial<Record<VitalField, VitalFlag>>;
  abnormalCount: number;
  hasCritical: boolean;
  summary: string[];
}

export interface VitalRange {
  low: number;
  high: number;
  criticalLow: number;
  criticalHigh: number;
  unit: string;
  label: string;
}

export interface Vitals extends Timestamps {
  _id: Id;
  id?: Id;
  patient: Id;
  admission?: Id;
  recordedAt: ISODate;
  recordedBy?: Ref<UserRef>;
  temperature?: number;
  pulse?: number;
  systolic?: number;
  diastolic?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  bloodSugar?: number;
  weight?: number;
  height?: number;
  painScore?: number;
  notes?: string;
  tenantId: string;
  /** Virtuals. */
  bloodPressure?: string | null;
  bmi?: number | null;
  /** Added by the API on read, never stored. */
  assessment?: VitalsAssessment;
}

export type VitalsInput = {
  [K in VitalField | 'weight' | 'height' | 'painScore']?: Numeric | null;
} & {
  recordedAt?: string;
  notes?: string;
};

export interface VitalsTrendPoint {
  recordedAt: ISODate;
  temperature: number | null;
  pulse: number | null;
  systolic: number | null;
  diastolic: number | null;
  oxygenSaturation: number | null;
  bloodSugar: number | null;
}

export interface VitalsHistory {
  count: number;
  patient: { id: Id; name: string; patientId: string; age: number | null };
  latest: Vitals | null;
  vitals: Vitals[];
  trend: VitalsTrendPoint[];
  referenceRanges: Record<VitalField, VitalRange>;
}

export interface AttentionRow {
  admissionId: string;
  patient: { id: Id; name: string; patientId: string; department: Department };
  location: string;
  lastRecordedAt: ISODate | null;
  overdue: boolean;
  assessment: VitalsAssessment | null;
}

/* ------------------------------- dashboard ------------------------------- */

/** One entry of the audit feed, as GET /api/dashboard/activities maps it. */
export interface ActivityLog {
  id: Id;
  type: string;
  entityType?: string;
  description: string;
  actor?: string;
  actorRole?: string;
  timestamp: ISODate;
}

export interface DashboardStats {
  totalStaff: number;
  activeDoctors: number;
  nurses: number;
  staffByRole: Partial<Record<Role, number>>;

  totalPatients: number;
  opdPatients: number;
  ipdPatients: number;
  activePatients: number;
  patientGrowth: number;
  newPatientsThisMonth: number;

  todayAppointments: number;
  upcomingAppointments: number;
  appointmentsByStatus: Partial<Record<AppointmentStatus, number>>;

  totalPrescriptions: number;
  pendingPrescriptions: number;

  medicineCount: number;
  lowStockCount: number;
  stockValue: number;

  totalRevenue: number;
  totalInvoiced: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  pendingPayments: number;

  bedCapacity: number;
  occupiedBeds: number;
  availableBeds: number;
  bedsOutOfService: number;
  activeAdmissions: number;
  bedSource: 'wards' | 'hospital-profile';
  occupancyRate: number;
}

export interface DashboardScope {
  hospitalName: string;
  tenantId: string;
  department: string;
}

export interface DashboardCharts {
  appointmentTrend: {
    date: string;
    label: string;
    total: number;
    completed: number;
    cancelled: number;
  }[];
  revenueTrend: { label: string; invoiced: number; collected: number }[];
  patientsByDepartment: { department: string; count: number }[];
  patientTypeSplit: { type: PatientType; count: number }[];
  topDoctors: { name: string; department?: Department; appointments: number }[];
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface DashboardAlert {
  severity: AlertSeverity;
  category: 'pharmacy' | 'billing';
  title: string;
  message: string;
  link?: string;
}

export interface SystemService {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  response: string;
}

export type SearchResultType = 'patient' | 'staff' | 'invoice';

export interface SearchResult {
  type: SearchResultType;
  id: Id;
  title: string;
  subtitle: string;
  link: string;
}

/* -------------------------------- reports -------------------------------- */

export interface ReportParams {
  from?: string;
  to?: string;
  days?: Numeric;
}

export interface Report {
  range: {
    from: string;
    to: string;
    days: number;
    comparedWith: { from: string; to: string };
  };
  summary: {
    revenueCollected: number;
    revenueInvoiced: number;
    revenueChange: number;
    invoices: number;
    invoicesChange: number;
    collectionRate: number;
    discountGiven: number;
    taxCollected: number;
    outstandingTotal: number;
    outstandingInvoices: number;
    newPatients: number;
    newPatientsChange: number;
    appointments: number;
    prescriptions: number;
    dispensed: number;
    admissions: number;
    discharges: number;
    averageLengthOfStay: number;
    activeStaff: number;
    pharmacyStockValue: number;
  };
  revenueByDay: { date: string; invoiced: number; collected: number }[];
  revenueByCategory: { category: string; amount: number; quantity: number }[];
  paymentMethods: { method: string; amount: number; count: number }[];
  patientsByDepartment: { department: string; count: number }[];
  patientsByType: { type: PatientType; count: number }[];
  appointmentsByStatus: { status: AppointmentStatus; count: number }[];
  doctorWorkload: {
    name: string;
    department?: Department;
    appointments: number;
    completed: number;
    cancelled: number;
    completionRate: number;
  }[];
  topMedicines: { medicine: string; prescribed: number; dispensed: number; times: number }[];
}

/* -------------------------------- call logs ------------------------------- */

export interface CallLog {
  id: string;
  startedAt: ISODate;
  endedAt: ISODate;
  durationSeconds: number;
  language: string;
  messages: number;
  caller: string | null;
  endedBy: string | null;
  summary: string | null;
  appointments?: { _id: Id; appointmentId: string }[];
}

export interface CallMessage {
  role: 'agent' | 'caller';
  text: string;
  /** The words as spoken, when `text` is an English translation. */
  original?: string;
}
