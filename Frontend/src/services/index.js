import api from './api';

/**
 * One thin module per resource. Every function returns the response body and
 * lets errors propagate, so a caller can `try/catch` once instead of checking a
 * hand-rolled `{ success }` envelope at every call site (the previous services
 * mixed both styles, which is why several screens showed empty tables instead
 * of an error).
 */

const unwrap = (promise) => promise.then((response) => response.data);

export const authService = {
  login: (credentials) => unwrap(api.post('/auth/login', credentials)),
  me: () => unwrap(api.get('/auth/me')),
  updateProfile: (data) => unwrap(api.put('/auth/me', data)),
  changePassword: (data) => unwrap(api.post('/auth/change-password', data)),
  demoCredentials: () => unwrap(api.get('/auth/demo-credentials'))
};

export const hospitalService = {
  register: (data) => unwrap(api.post('/hospitals/register', data)),
  verify: (token) => unwrap(api.get(`/hospitals/verify/${token}`)),
  checkLicense: (licenseNumber) => unwrap(api.get(`/hospitals/check-license/${licenseNumber}`)),
  getMine: () => unwrap(api.get('/hospitals/me')),
  updateMine: (data) => unwrap(api.put('/hospitals/me', data))
};

export const userService = {
  list: (params) => unwrap(api.get('/users', { params })),
  doctors: (params) => unwrap(api.get('/users/doctors', { params })),
  get: (id) => unwrap(api.get(`/users/${id}`)),
  create: (data) => unwrap(api.post('/users', data)),
  update: (id, data) => unwrap(api.put(`/users/${id}`, data)),
  resetPassword: (id) => unwrap(api.post(`/users/${id}/reset-password`)),
  remove: (id) => unwrap(api.delete(`/users/${id}`))
};

export const patientService = {
  list: (params) => unwrap(api.get('/patients', { params })),
  get: (id) => unwrap(api.get(`/patients/${id}`)),
  create: (data) => unwrap(api.post('/patients', data)),
  update: (id, data) => unwrap(api.put(`/patients/${id}`, data)),
  discharge: (id, data) => unwrap(api.post(`/patients/${id}/discharge`, data)),
  remove: (id) => unwrap(api.delete(`/patients/${id}`))
};

export const appointmentService = {
  list: (params) => unwrap(api.get('/appointments', { params })),
  today: () => unwrap(api.get('/appointments/today')),
  byPatient: (patientId, params) => unwrap(api.get(`/appointments/patient/${patientId}`, { params })),
  byDoctor: (doctorId, params) => unwrap(api.get(`/appointments/doctor/${doctorId}`, { params })),
  availability: (doctorId, date) =>
    unwrap(api.get('/appointments/availability', { params: { doctorId, date } })),
  create: (data) => unwrap(api.post('/appointments', data)),
  update: (id, data) => unwrap(api.put(`/appointments/${id}`, data)),
  setStatus: (id, data) => unwrap(api.patch(`/appointments/${id}/status`, data)),
  remove: (id) => unwrap(api.delete(`/appointments/${id}`))
};

export const prescriptionService = {
  list: (params) => unwrap(api.get('/prescriptions', { params })),
  get: (id) => unwrap(api.get(`/prescriptions/${id}`)),
  byPatient: (patientId, params) => unwrap(api.get(`/prescriptions/patient/${patientId}`, { params })),
  stockCheck: (id) => unwrap(api.get(`/prescriptions/${id}/stock-check`)),
  create: (data) => unwrap(api.post('/prescriptions', data)),
  update: (id, data) => unwrap(api.put(`/prescriptions/${id}`, data)),
  setStatus: (id, data) => unwrap(api.put(`/prescriptions/${id}/status`, data)),
  remove: (id) => unwrap(api.delete(`/prescriptions/${id}`))
};

export const pharmacyService = {
  list: (params) => unwrap(api.get('/pharmacy/medicines', { params })),
  get: (id) => unwrap(api.get(`/pharmacy/medicines/${id}`)),
  lowStock: () => unwrap(api.get('/pharmacy/medicines/low-stock')),
  expiring: (days) => unwrap(api.get('/pharmacy/medicines/expiring', { params: { days } })),
  create: (data) => unwrap(api.post('/pharmacy/medicines', data)),
  update: (id, data) => unwrap(api.put(`/pharmacy/medicines/${id}`, data)),
  updateStock: (id, data) => unwrap(api.put(`/pharmacy/medicines/${id}/stock`, data)),
  remove: (id) => unwrap(api.delete(`/pharmacy/medicines/${id}`)),
  dispense: (prescriptionId, data) =>
    unwrap(api.post(`/pharmacy/prescriptions/${prescriptionId}/dispense`, data))
};

export const billingService = {
  list: (params) => unwrap(api.get('/billing/invoices', { params })),
  get: (id) => unwrap(api.get(`/billing/invoices/${id}`)),
  byPatient: (patientId, params) =>
    unwrap(api.get(`/billing/patients/${patientId}/invoices`, { params })),
  create: (data) => unwrap(api.post('/billing/invoices', data)),
  createFromAppointment: (appointmentId, data) =>
    unwrap(api.post(`/billing/invoices/from-appointment/${appointmentId}`, data)),
  update: (id, data) => unwrap(api.put(`/billing/invoices/${id}`, data)),
  recordPayment: (id, data) => unwrap(api.post(`/billing/invoices/${id}/payments`, data)),
  cancel: (id, data) => unwrap(api.post(`/billing/invoices/${id}/cancel`, data)),
  dashboard: () => unwrap(api.get('/billing/dashboard'))
};

export const wardService = {
  list: (params) => unwrap(api.get('/wards', { params })),
  get: (id) => unwrap(api.get(`/wards/${id}`)),
  create: (data) => unwrap(api.post('/wards', data)),
  update: (id, data) => unwrap(api.put(`/wards/${id}`, data)),
  remove: (id) => unwrap(api.delete(`/wards/${id}`)),
  addBed: (wardId, data) => unwrap(api.post(`/wards/${wardId}/beds`, data)),
  availableBeds: (params) => unwrap(api.get('/beds/available', { params })),
  updateBed: (id, data) => unwrap(api.put(`/beds/${id}`, data)),
  removeBed: (id) => unwrap(api.delete(`/beds/${id}`))
};

export const admissionService = {
  list: (params) => unwrap(api.get('/admissions', { params })),
  get: (id) => unwrap(api.get(`/admissions/${id}`)),
  admit: (data) => unwrap(api.post('/admissions', data)),
  transfer: (id, data) => unwrap(api.post(`/admissions/${id}/transfer`, data)),
  discharge: (id, data) => unwrap(api.post(`/admissions/${id}/discharge`, data))
};

export const vitalsService = {
  list: (patientId, params) => unwrap(api.get(`/patients/${patientId}/vitals`, { params })),
  record: (patientId, data) => unwrap(api.post(`/patients/${patientId}/vitals`, data)),
  remove: (id) => unwrap(api.delete(`/vitals/${id}`)),
  attention: () => unwrap(api.get('/vitals/attention'))
};

export const reportService = {
  get: (params) => unwrap(api.get('/reports', { params }))
};

export const dashboardService = {
  stats: () => unwrap(api.get('/dashboard/stats')),
  charts: (days) => unwrap(api.get('/dashboard/charts', { params: { days } })),
  activities: (limit) => unwrap(api.get('/dashboard/activities', { params: { limit } })),
  alerts: () => unwrap(api.get('/dashboard/alerts')),
  systemStatus: () => unwrap(api.get('/dashboard/system-status'))
};

export const metaService = {
  get: () => unwrap(api.get('/meta')),
  search: (q) => unwrap(api.get('/search', { params: { q } }))
};
