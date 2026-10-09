import type { AxiosResponse } from 'axios';
import api from './api';
import type {
  ApiResponse,
  Paginated,
  Id,
  PageParams,
  AuthUser,
  LoginCredentials,
  LoginResponse,
  ProfileInput,
  ChangePasswordInput,
  DemoCredentials,
  User,
  StaffInput,
  UserListParams,
  Department,
  Hospital,
  Tenant,
  CreateTenantInput,
  CreateTenantResponse,
  HospitalStatus,
  HospitalUpdateInput,
  Patient,
  PatientInput,
  PatientListParams,
  PatientStats,
  Appointment,
  AppointmentInput,
  AppointmentListParams,
  AppointmentStatus,
  AppointmentStatusInput,
  DoctorAvailability,
  Prescription,
  PrescriptionInput,
  PrescriptionListParams,
  PrescriptionStatusInput,
  PharmacyStatus,
  StockCheck,
  Medicine,
  MedicineInput,
  MedicineListParams,
  PharmacyStats,
  StockUpdateInput,
  DispenseInput,
  Invoice,
  InvoiceInput,
  InvoiceListParams,
  InvoiceStats,
  PaymentInput,
  PaymentStatus,
  FinancialDashboard,
  WardSummary,
  WardTotals,
  Ward,
  WardInput,
  Bed,
  BedInput,
  AvailableBed,
  Admission,
  AdmissionListParams,
  AdmitInput,
  TransferInput,
  AdmissionDischargeInput,
  Vitals,
  VitalsInput,
  VitalsAssessment,
  VitalsHistory,
  AttentionRow,
  Report,
  ReportParams,
  DashboardStats,
  DashboardScope,
  DashboardCharts,
  ActivityLog,
  DashboardAlert,
  SystemService,
  Meta,
  SearchResult,
  CallLog,
  CallMessage,
  PageMeta
} from '../types';

/**
 * One thin module per resource. Every function returns the response body and
 * lets errors propagate, so a caller can `try/catch` once instead of checking a
 * hand-rolled `{ success }` envelope at every call site (the previous services
 * mixed both styles, which is why several screens showed empty tables instead
 * of an error).
 */

const unwrap = <T>(promise: Promise<AxiosResponse<T>>): Promise<T> =>
  promise.then((response) => response.data);

/** A plain acknowledgement: `{ success, message }`. */
type Ack = ApiResponse;
/** A non-paginated list that also reports its length. */
type Counted<T extends object> = ApiResponse<T & { count: number }>;

export const authService = {
  login: (credentials: LoginCredentials) =>
    unwrap(api.post<ApiResponse<LoginResponse>>('/auth/login', credentials)),
  me: () => unwrap(api.get<ApiResponse<{ user: AuthUser }>>('/auth/me')),
  updateProfile: (data: ProfileInput) =>
    unwrap(api.put<ApiResponse<{ user: AuthUser }>>('/auth/me', data)),
  changePassword: (data: ChangePasswordInput) =>
    unwrap(api.post<Ack>('/auth/change-password', data)),
  demoCredentials: () => unwrap(api.get<ApiResponse<DemoCredentials>>('/auth/demo-credentials'))
};

/** The website's onboarding request form (public). */
export interface OnboardingRequest {
  hospitalName: string;
  contactName: string;
  email: string;
  phone: string;
  city?: string;
  beds?: string;
  message?: string;
  /** Honeypot, left empty by people. */
  company?: string;
}

export const contactService = {
  requestOnboarding: (data: OnboardingRequest) => unwrap(api.post<Ack>('/contact', data))
};

/** The platform admin (SUPER_ADMIN only). */
export const platformService = {
  tenants: () => unwrap(api.get<ApiResponse<{ tenants: Tenant[] }>>('/platform/tenants')),
  createTenant: (data: CreateTenantInput) =>
    unwrap(api.post<ApiResponse<CreateTenantResponse>>('/platform/tenants', data)),
  setStatus: (tenantId: string, status: Extract<HospitalStatus, 'ACTIVE' | 'SUSPENDED'>) =>
    unwrap(api.patch<ApiResponse<{ tenant: Tenant }>>(`/platform/tenants/${tenantId}/status`, { status })),
  mailCheck: (to?: string) =>
    unwrap(api.post<ApiResponse<{ to: string; delivered: boolean }>>('/platform/mail-check', to ? { to } : {}))
};

export const hospitalService = {
  getMine: () =>
    unwrap(
      api.get<
        ApiResponse<{
          hospital: Hospital;
          summary: { staffCount: number; patientCount: number; appointmentCount: number };
        }>
      >('/hospitals/me')
    ),
  updateMine: (data: HospitalUpdateInput) =>
    unwrap(api.put<ApiResponse<{ hospital: Hospital }>>('/hospitals/me', data))
};

export const userService = {
  list: (params?: UserListParams) =>
    unwrap(api.get<Paginated<{ users: User[]; count: number }>>('/users', { params })),
  doctors: (params?: { department?: Department | string }) =>
    unwrap(api.get<Counted<{ doctors: User[] }>>('/users/doctors', { params })),
  get: (id: Id) =>
    unwrap(
      api.get<ApiResponse<{ user: User; stats: { upcomingAppointments: number } }>>(`/users/${id}`)
    ),
  create: (data: StaffInput) =>
    unwrap(api.post<ApiResponse<{ user: User; temporaryPassword?: string }>>('/users', data)),
  update: (id: Id, data: StaffInput) =>
    unwrap(api.put<ApiResponse<{ user: User }>>(`/users/${id}`, data)),
  resetPassword: (id: Id) =>
    unwrap(api.post<ApiResponse<{ temporaryPassword: string }>>(`/users/${id}/reset-password`)),
  /** Deactivates instead of deleting when the person still has appointments. */
  remove: (id: Id) => unwrap(api.delete<ApiResponse<{ deactivated?: boolean }>>(`/users/${id}`))
};

export const patientService = {
  list: (params?: PatientListParams) =>
    unwrap(
      api.get<Paginated<{ patients: Patient[]; totalPatients: number; stats: PatientStats }>>(
        '/patients',
        { params }
      )
    ),
  get: (id: Id) =>
    unwrap(
      api.get<
        ApiResponse<{
          patient: Patient;
          history: {
            appointments: Appointment[];
            prescriptions: Prescription[];
            invoices: Invoice[];
          };
          summary: {
            appointmentCount: number;
            prescriptionCount: number;
            outstandingBalance: number;
          };
        }>
      >(`/patients/${id}`)
    ),
  create: (data: PatientInput) =>
    unwrap(api.post<ApiResponse<{ patient: Patient }>>('/patients', data)),
  update: (id: Id, data: PatientInput) =>
    unwrap(api.put<ApiResponse<{ patient: Patient }>>(`/patients/${id}`, data)),
  discharge: (id: Id, data: { notes?: string }) =>
    unwrap(api.post<ApiResponse<{ patient: Patient }>>(`/patients/${id}/discharge`, data)),
  /** Archives instead of deleting when the patient has clinical history. */
  remove: (id: Id) => unwrap(api.delete<ApiResponse<{ archived?: boolean }>>(`/patients/${id}`))
};

export const appointmentService = {
  list: (params?: AppointmentListParams) =>
    unwrap(
      api.get<
        Paginated<{
          appointments: Appointment[];
          totalAppointments: number;
          statusCounts: Partial<Record<AppointmentStatus, number>>;
        }>
      >('/appointments', { params })
    ),
  today: () =>
    unwrap(api.get<Counted<{ date: string; appointments: Appointment[] }>>('/appointments/today')),
  byPatient: (patientId: Id, params?: PageParams) =>
    unwrap(
      api.get<Counted<{ appointments: Appointment[] }>>(`/appointments/patient/${patientId}`, {
        params
      })
    ),
  byDoctor: (doctorId: Id, params?: { status?: AppointmentStatus; date?: string }) =>
    unwrap(
      api.get<Counted<{ appointments: Appointment[] }>>(`/appointments/doctor/${doctorId}`, {
        params
      })
    ),
  availability: (doctorId: Id, date: string) =>
    unwrap(
      api.get<ApiResponse<DoctorAvailability>>('/appointments/availability', {
        params: { doctorId, date }
      })
    ),
  create: (data: AppointmentInput) =>
    unwrap(api.post<ApiResponse<{ appointment: Appointment }>>('/appointments', data)),
  update: (id: Id, data: AppointmentInput) =>
    unwrap(api.put<ApiResponse<{ appointment: Appointment }>>(`/appointments/${id}`, data)),
  setStatus: (id: Id, data: AppointmentStatusInput) =>
    unwrap(
      api.patch<ApiResponse<{ appointment: Appointment }>>(`/appointments/${id}/status`, data)
    ),
  remove: (id: Id) => unwrap(api.delete<Ack>(`/appointments/${id}`))
};

export const prescriptionService = {
  list: (params?: PrescriptionListParams) =>
    unwrap(
      api.get<
        Paginated<{
          prescriptions: Prescription[];
          totalPrescriptions: number;
          pharmacyCounts: Partial<Record<PharmacyStatus, number>>;
        }>
      >('/prescriptions', { params })
    ),
  get: (id: Id) =>
    unwrap(api.get<ApiResponse<{ prescription: Prescription }>>(`/prescriptions/${id}`)),
  byPatient: (patientId: Id, params?: { status?: string }) =>
    unwrap(
      api.get<Counted<{ prescriptions: Prescription[] }>>(`/prescriptions/patient/${patientId}`, {
        params
      })
    ),
  stockCheck: (id: Id) =>
    unwrap(api.get<ApiResponse<StockCheck>>(`/prescriptions/${id}/stock-check`)),
  create: (data: PrescriptionInput) =>
    unwrap(
      api.post<ApiResponse<{ prescription: Prescription; warnings?: string[] }>>(
        '/prescriptions',
        data
      )
    ),
  update: (id: Id, data: PrescriptionInput) =>
    unwrap(api.put<ApiResponse<{ prescription: Prescription }>>(`/prescriptions/${id}`, data)),
  setStatus: (id: Id, data: PrescriptionStatusInput) =>
    unwrap(
      api.put<ApiResponse<{ prescription: Prescription }>>(`/prescriptions/${id}/status`, data)
    ),
  remove: (id: Id) => unwrap(api.delete<Ack>(`/prescriptions/${id}`))
};

export const pharmacyService = {
  list: (params?: MedicineListParams) =>
    unwrap(
      api.get<
        Paginated<{
          medicines: Medicine[];
          totalMedicines: number;
          stats: PharmacyStats;
          lowStockAlert: number;
        }>
      >('/pharmacy/medicines', { params })
    ),
  get: (id: Id) =>
    unwrap(api.get<ApiResponse<{ medicine: Medicine }>>(`/pharmacy/medicines/${id}`)),
  lowStock: () =>
    unwrap(api.get<Counted<{ medicines: Medicine[] }>>('/pharmacy/medicines/low-stock')),
  expiring: (days?: number) =>
    unwrap(
      api.get<Counted<{ withinDays: number; medicines: Medicine[] }>>(
        '/pharmacy/medicines/expiring',
        { params: { days } }
      )
    ),
  create: (data: MedicineInput) =>
    unwrap(api.post<ApiResponse<{ medicine: Medicine }>>('/pharmacy/medicines', data)),
  update: (id: Id, data: MedicineInput) =>
    unwrap(api.put<ApiResponse<{ medicine: Medicine }>>(`/pharmacy/medicines/${id}`, data)),
  updateStock: (id: Id, data: StockUpdateInput) =>
    unwrap(api.put<ApiResponse<{ medicine: Medicine }>>(`/pharmacy/medicines/${id}/stock`, data)),
  /** Marks the medicine discontinued instead when stock remains. */
  remove: (id: Id) =>
    unwrap(api.delete<ApiResponse<{ discontinued?: boolean }>>(`/pharmacy/medicines/${id}`)),
  dispense: (prescriptionId: Id, data: DispenseInput) =>
    unwrap(
      api.post<ApiResponse<{ prescription: Prescription; invoice?: Invoice | null }>>(
        `/pharmacy/prescriptions/${prescriptionId}/dispense`,
        data
      )
    )
};

export const billingService = {
  list: (params?: InvoiceListParams) =>
    unwrap(
      api.get<Paginated<{ invoices: Invoice[]; totalInvoices: number; stats: InvoiceStats }>>(
        '/billing/invoices',
        { params }
      )
    ),
  get: (id: Id) => unwrap(api.get<ApiResponse<{ invoice: Invoice }>>(`/billing/invoices/${id}`)),
  byPatient: (patientId: Id, params?: PageParams & { paymentStatus?: PaymentStatus }) =>
    unwrap(
      api.get<Paginated<{ invoices: Invoice[]; totalInvoices: number; outstanding: number }>>(
        `/billing/patients/${patientId}/invoices`,
        { params }
      )
    ),
  create: (data: InvoiceInput) =>
    unwrap(api.post<ApiResponse<{ invoice: Invoice }>>('/billing/invoices', data)),
  createFromAppointment: (appointmentId: Id, data: Pick<InvoiceInput, 'taxPercentage'>) =>
    unwrap(
      api.post<ApiResponse<{ invoice: Invoice }>>(
        `/billing/invoices/from-appointment/${appointmentId}`,
        data
      )
    ),
  update: (id: Id, data: InvoiceInput) =>
    unwrap(api.put<ApiResponse<{ invoice: Invoice }>>(`/billing/invoices/${id}`, data)),
  recordPayment: (id: Id, data: PaymentInput) =>
    unwrap(api.post<ApiResponse<{ invoice: Invoice }>>(`/billing/invoices/${id}/payments`, data)),
  cancel: (id: Id, data: { reason?: string }) =>
    unwrap(api.post<ApiResponse<{ invoice: Invoice }>>(`/billing/invoices/${id}/cancel`, data)),
  dashboard: () =>
    unwrap(api.get<ApiResponse<{ dashboard: FinancialDashboard }>>('/billing/dashboard'))
};

export const wardService = {
  list: (params?: { department?: Department | 'All' | string; status?: string }) =>
    unwrap(api.get<Counted<{ wards: WardSummary[]; totals: WardTotals }>>('/wards', { params })),
  get: (id: Id) => unwrap(api.get<ApiResponse<{ ward: Ward; beds: Bed[] }>>(`/wards/${id}`)),
  create: (data: WardInput) =>
    unwrap(api.post<ApiResponse<{ ward: Ward; beds: Bed[] }>>('/wards', data)),
  update: (id: Id, data: WardInput) =>
    unwrap(api.put<ApiResponse<{ ward: Ward }>>(`/wards/${id}`, data)),
  remove: (id: Id) => unwrap(api.delete<Ack>(`/wards/${id}`)),
  addBed: (wardId: Id, data: BedInput) =>
    unwrap(api.post<ApiResponse<{ bed: Bed }>>(`/wards/${wardId}/beds`, data)),
  availableBeds: (params?: { department?: Department | 'All' | string }) =>
    unwrap(api.get<Counted<{ beds: AvailableBed[] }>>('/beds/available', { params })),
  updateBed: (id: Id, data: BedInput) =>
    unwrap(api.put<ApiResponse<{ bed: Bed }>>(`/beds/${id}`, data)),
  removeBed: (id: Id) => unwrap(api.delete<Ack>(`/beds/${id}`))
};

export const admissionService = {
  list: (params?: AdmissionListParams) =>
    unwrap(api.get<Paginated<{ admissions: Admission[] }>>('/admissions', { params })),
  get: (id: Id) => unwrap(api.get<ApiResponse<{ admission: Admission }>>(`/admissions/${id}`)),
  admit: (data: AdmitInput) =>
    unwrap(api.post<ApiResponse<{ admission: Admission }>>('/admissions', data)),
  transfer: (id: Id, data: TransferInput) =>
    unwrap(api.post<ApiResponse<{ admission: Admission }>>(`/admissions/${id}/transfer`, data)),
  discharge: (id: Id, data: AdmissionDischargeInput) =>
    unwrap(
      api.post<ApiResponse<{ admission: Admission; invoice: Invoice | null }>>(
        `/admissions/${id}/discharge`,
        data
      )
    )
};

export const vitalsService = {
  list: (patientId: Id, params?: { limit?: number }) =>
    unwrap(api.get<ApiResponse<VitalsHistory>>(`/patients/${patientId}/vitals`, { params })),
  record: (patientId: Id, data: VitalsInput) =>
    unwrap(
      api.post<ApiResponse<{ vitals: Vitals; assessment: VitalsAssessment }>>(
        `/patients/${patientId}/vitals`,
        data
      )
    ),
  remove: (id: Id) => unwrap(api.delete<Ack>(`/vitals/${id}`)),
  attention: () =>
    unwrap(api.get<Counted<{ inpatients: number; attention: AttentionRow[] }>>('/vitals/attention'))
};

export const reportService = {
  get: (params?: ReportParams) => unwrap(api.get<ApiResponse<Report>>('/reports', { params }))
};

export const dashboardService = {
  stats: () =>
    unwrap(
      api.get<ApiResponse<{ stats: DashboardStats; scope: DashboardScope }>>('/dashboard/stats')
    ),
  charts: (days?: number) =>
    unwrap(
      api.get<ApiResponse<{ charts: DashboardCharts }>>('/dashboard/charts', { params: { days } })
    ),
  activities: (limit?: number) =>
    unwrap(
      api.get<Counted<{ activities: ActivityLog[] }>>('/dashboard/activities', {
        params: { limit }
      })
    ),
  alerts: () => unwrap(api.get<Counted<{ alerts: DashboardAlert[] }>>('/dashboard/alerts')),
  systemStatus: () =>
    unwrap(api.get<ApiResponse<{ services: SystemService[] }>>('/dashboard/system-status'))
};

export const metaService = {
  get: () => unwrap(api.get<ApiResponse<{ meta: Meta }>>('/meta')),
  search: (q: string) =>
    unwrap(
      api.get<ApiResponse<{ query: string; count?: number; results: SearchResult[] }>>('/search', {
        params: { q }
      })
    )
};

export const callService = {
  list: (params: { from?: string; to?: string; page?: number }) =>
    unwrap(api.get<ApiResponse<{ calls: CallLog[]; meta: PageMeta }>>('/calls', { params })),
  forAppointment: (appointmentId: Id) =>
    unwrap(api.get<ApiResponse<{ call: CallLog | null }>>(`/calls/for-appointment/${appointmentId}`)),
  transcript: (id: string) =>
    unwrap(api.get<ApiResponse<{ messages: CallMessage[] }>>('/calls/transcript', { params: { id } })),
  /** The WAV as a Blob: an <audio> tag cannot send our Authorization header itself. */
  recording: (id: string) =>
    unwrap(api.get<Blob>('/calls/recording', { params: { id }, responseType: 'blob', timeout: 120000 }))
};
