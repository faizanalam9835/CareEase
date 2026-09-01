/* eslint-disable no-console */
/**
 * End-to-end API test suite.
 *
 *   npm test
 *
 * Boots the real Express app against the database named by TEST_MONGO_URI
 * (default: the configured MONGO_URI with a `_test` suffix), seeds the demo
 * tenant into it, exercises every route and then drops the test database.
 * Your development data is never touched.
 */

const path = require('path');
const { spawnSync } = require('child_process');
const mongoose = require('mongoose');

const ROOT = path.join(__dirname, '..');

// Set before config/env is loaded, so the request logger and the mail
// console fallback stay quiet and the run is readable.
process.env.NODE_ENV = 'test';

const config = require(path.join(ROOT, 'config', 'env'));

const TEST_URI =
  process.env.TEST_MONGO_URI ||
  config.mongoUri.replace(/(\/[^/?]+)(\?|$)/, '$1_test$2');

process.env.MONGO_URI = TEST_URI;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'careease-test-secret';
process.env.DEMO_MODE = 'true';

const PORT = Number(process.env.TEST_PORT) || 5199;
const BASE = `http://127.0.0.1:${PORT}`;

/* ------------------------------ tiny harness ----------------------------- */

let passed = 0;
let failed = 0;
const failures = [];
let currentGroup = '';

const group = (name) => {
  currentGroup = name;
  console.log(`\n  ${name}`);
};

const check = (name, condition, context) => {
  if (condition) {
    passed += 1;
    console.log(`    ok    ${name}`);
  } else {
    failed += 1;
    failures.push(`${currentGroup} > ${name}`);
    const detail = context === undefined ? '' : ` -> ${JSON.stringify(context).slice(0, 300)}`;
    console.log(`    FAIL  ${name}${detail}`);
  }
};

const call = async (method, url, { token, body } = {}) => {
  const response = await fetch(`${BASE}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
};

/* --------------------------------- suite --------------------------------- */

const run = async () => {
  console.log('\n  CareEase API test suite');
  console.log(`  database: ${TEST_URI.replace(/\/\/[^@]*@/, '//***@')}\n`);

  const seed = spawnSync(process.execPath, [path.join(ROOT, 'seed', 'seed.js'), '--reset'], {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, MONGO_URI: TEST_URI }
  });
  if (seed.status !== 0) {
    console.error('  seeding the test database failed');
    process.exit(1);
  }
  console.log('  test data seeded');

  await require(path.join(ROOT, 'config', 'db'))(TEST_URI);
  const app = require(path.join(ROOT, 'Server'));
  const server = app.listen(PORT);

  const finish = async () => {
    server.close();
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.connection.close().catch(() => {});
  };

  try {
    /* ---------------------------- public routes --------------------------- */
    group('Public endpoints');

    let r = await call('GET', '/api/health');
    check('health check responds', r.status === 200 && r.data.status === 'OK', r.data);

    r = await call('GET', '/api/meta');
    check('meta serves the shared enumerations', r.data?.meta?.departments?.length > 5, r.data);

    r = await call('GET', '/api/auth/demo-credentials');
    check('demo credentials are listed', r.data?.accounts?.length === 5, r.data);
    check('every demo account exists in the database', r.data.accounts.every((a) => a.available));
    const TENANT = r.data.tenantId;

    /* -------------------------------- login ------------------------------- */
    group('Authentication');

    r = await call('POST', '/api/auth/login', {
      body: { email: 'admin@careease.health', password: 'Admin@123', tenantId: TENANT }
    });
    // Regression: the old tenant middleware rejected login itself, because no
    // client can send an x-tenant-id header before it has a session.
    check('login works without an x-tenant-id header', r.status === 200 && !!r.data.token, r.data);
    check('login returns the hospital name', !!r.data.user?.hospitalName);
    const admin = r.data.token;

    r = await call('POST', '/api/auth/login', {
      body: { email: 'admin@careease.health', password: 'nope', tenantId: TENANT }
    });
    check('a wrong password is rejected', r.status === 401, r.data);
    // Regression: the old handler returned the whole user document on a
    // password mismatch, hash included.
    check('a failed login leaks no user record', !r.data.user, r.data);

    r = await call('POST', '/api/auth/login', {
      body: { email: 'admin@careease.health', password: 'Admin@123', tenantId: 'TWRONG99' }
    });
    check('the right password against the wrong hospital is rejected', r.status === 401);

    const tokens = { admin };
    for (const [key, email, password] of [
      ['doctor', 'doctor@careease.health', 'Doctor@123'],
      ['nurse', 'nurse@careease.health', 'Nurse@123'],
      ['reception', 'reception@careease.health', 'Reception@123'],
      ['pharmacy', 'pharmacy@careease.health', 'Pharmacy@123']
    ]) {
      const res = await call('POST', '/api/auth/login', { body: { email, password, tenantId: TENANT } });
      tokens[key] = res.data.token;
      check(`${key} can sign in`, res.status === 200 && !!res.data.token, res.data);
    }

    r = await call('GET', '/api/patients');
    check('a request with no token is rejected', r.status === 401);
    r = await call('GET', '/api/patients', { token: 'not-a-token' });
    check('a malformed token is rejected', r.status === 401);

    r = await call('GET', '/api/auth/me', { token: admin });
    check('the profile endpoint works', r.data?.user?.email === 'admin@careease.health');
    check('the profile never contains the password hash', !r.data.user.password);

    /* ------------------------------ dashboard ----------------------------- */
    group('Dashboard');

    r = await call('GET', '/api/dashboard/stats', { token: admin });
    check('the stats endpoint exists', r.status === 200, r.data);
    const stats = r.data.stats;
    check('patient count is real', stats.totalPatients === 18, stats?.totalPatients);
    check('doctor count is real', stats.activeDoctors === 6, stats?.activeDoctors);
    // Regression: revenue and occupancy used to be constants in the browser.
    check('revenue is computed, not the old hard-coded 450000', stats.totalRevenue > 0 && stats.totalRevenue !== 450000, stats?.totalRevenue);
    // Capacity now comes from the seeded wards rather than the single figure
    // on the hospital profile, so it is the bed count, not bedCapacity.
    check('occupancy is derived from real beds', stats.bedCapacity === 60 && stats.occupancyRate > 0, stats);

    r = await call('GET', '/api/dashboard/charts', { token: admin });
    check('appointment trend has one point per day', r.data?.charts?.appointmentTrend?.length === 14);
    check('the revenue trend spans several months', r.data.charts.revenueTrend.length >= 2, r.data.charts.revenueTrend?.length);
    check('patients are grouped by department', r.data.charts.patientsByDepartment.length >= 5);

    r = await call('GET', '/api/dashboard/activities', { token: admin });
    check('the audit feed returns entries', r.data?.activities?.length > 0);

    r = await call('GET', '/api/dashboard/alerts', { token: admin });
    check('low stock raises an alert', r.data?.alerts?.some((a) => a.category === 'pharmacy'), r.data?.alerts);

    r = await call('GET', '/api/dashboard/system-status', { token: admin });
    check('system status really pings the database', r.data?.services?.[1]?.status === 'operational', r.data?.services);

    /* ------------------------------- patients ----------------------------- */
    group('Patients and department isolation');

    r = await call('GET', '/api/patients', { token: admin });
    check('an admin sees every patient', r.data.totalPatients === 18, r.data?.totalPatients);
    const patients = r.data.patients;
    const cardio = patients.find((p) => p.department === 'Cardiology');
    const ortho = patients.find((p) => p.department === 'Orthopedics');

    r = await call('GET', '/api/patients', { token: tokens.doctor });
    // Regression: the list endpoint used to ignore ABAC entirely, so a
    // cardiologist could read every department's patients.
    check(
      'a doctor only sees their own department',
      r.data.patients.length > 0 && r.data.patients.every((p) => p.department === 'Cardiology'),
      r.data.patients?.map((p) => p.department)
    );

    r = await call('GET', `/api/patients/${ortho._id}`, { token: tokens.doctor });
    check('a cardiologist cannot open an orthopaedic patient', r.status === 403, r.data);

    r = await call('GET', `/api/patients/${cardio._id}`, { token: tokens.doctor });
    check('a cardiologist can open their own patient', r.status === 200 && !!r.data.history);
    check('the patient file includes clinical history', Array.isArray(r.data.history.appointments));

    r = await call('POST', '/api/patients', {
      token: tokens.reception,
      body: {
        firstName: 'Test', lastName: 'Patient', dateOfBirth: '1990-01-01',
        gender: 'Male', phone: '9999900001', department: 'Cardiology'
      }
    });
    check('a receptionist can register a patient', r.status === 201, r.data);
    check('the patient id follows the tenant pattern', /^TDEMO001-P-\d{4}$/.test(r.data.patient?.patientId), r.data.patient?.patientId);
    const newPatientId = r.data.patient._id;

    r = await call('POST', '/api/patients', {
      token: tokens.reception,
      body: {
        firstName: 'Dup', lastName: 'Phone', dateOfBirth: '1990-01-01',
        gender: 'Male', phone: '9999900001', department: 'Cardiology'
      }
    });
    check('a duplicate phone number is a clean 409', r.status === 409, r.data);

    r = await call('POST', '/api/patients', {
      token: tokens.reception,
      body: { firstName: 'No', lastName: 'Dob', gender: 'Male', phone: '9999900002' }
    });
    check('a missing required field is a 400', r.status === 400, r.data);

    r = await call('POST', '/api/patients', {
      token: tokens.reception,
      body: {
        firstName: 'Future', lastName: 'Born', dateOfBirth: '2999-01-01',
        gender: 'Male', phone: '9999900003', department: 'Cardiology'
      }
    });
    check('a date of birth in the future is rejected', r.status === 400, r.data);

    // Regression: the frontend had a delete button but the route did not exist.
    r = await call('DELETE', `/api/patients/${newPatientId}`, { token: admin });
    check('DELETE /patients/:id exists', r.status === 200, r.data);

    /* ----------------------------- appointments --------------------------- */
    group('Appointments');

    r = await call('GET', '/api/users/doctors', { token: admin });
    check('the doctor lookup endpoint works', r.status === 200 && r.data.doctors.length === 6, r.data?.doctors?.length);
    const cardiologist = r.data.doctors.find((d) => d.department === 'Cardiology');

    const slotDate = new Date();
    slotDate.setDate(slotDate.getDate() + 40);
    const dateStr = slotDate.toISOString().split('T')[0];

    r = await call('POST', '/api/appointments', {
      token: tokens.reception,
      body: {
        patientId: cardio._id, doctorId: cardiologist._id,
        appointmentDate: dateStr, appointmentTime: '11:00', reason: 'Test booking'
      }
    });
    check('an appointment can be booked', r.status === 201, r.data);
    const appointmentId = r.data.appointment._id;

    // New behaviour: nothing used to stop a doctor being booked ten times over.
    r = await call('POST', '/api/appointments', {
      token: tokens.reception,
      body: {
        patientId: cardio._id, doctorId: cardiologist._id,
        appointmentDate: dateStr, appointmentTime: '11:15', reason: 'Overlaps the one above'
      }
    });
    check('an overlapping slot is refused', r.status === 409, r.data);

    r = await call('POST', '/api/appointments', {
      token: tokens.reception,
      body: {
        patientId: ortho._id, doctorId: cardiologist._id,
        appointmentDate: dateStr, appointmentTime: '14:00', reason: 'Wrong department'
      }
    });
    check('a cross-department booking is refused', r.status === 400, r.data);

    r = await call('POST', '/api/appointments', {
      token: tokens.reception,
      body: {
        patientId: cardio._id, doctorId: cardiologist._id,
        appointmentDate: dateStr, appointmentTime: '25:99', reason: 'Bad time'
      }
    });
    check('a malformed time is refused', r.status === 400, r.data);

    r = await call('GET', `/api/appointments/availability?doctorId=${cardiologist._id}&date=${dateStr}`, { token: tokens.reception });
    check('the availability endpoint returns slots', r.status === 200 && r.data.slots.length > 0);
    check('the booked slot is marked unavailable', r.data.slots.find((s) => s.time === '11:00')?.available === false, r.data.slots?.slice(0, 4));

    r = await call('PATCH', `/api/appointments/${appointmentId}/status`, {
      token: tokens.reception, body: { status: 'Cancelled' }
    });
    check('cancelling without a reason is refused', r.status === 400, r.data);

    r = await call('PATCH', `/api/appointments/${appointmentId}/status`, {
      token: tokens.reception, body: { status: 'Cancelled', cancellationReason: 'Patient called' }
    });
    check('cancelling with a reason succeeds', r.status === 200, r.data);

    r = await call('GET', '/api/appointments', { token: tokens.doctor });
    check(
      'a doctor only sees their own diary',
      r.data.appointments.every((a) => String(a.doctorId?._id) === String(cardiologist._id)),
      r.data.appointments?.length
    );

    r = await call('GET', '/api/appointments/today', { token: admin });
    check("today's list is served", r.status === 200 && typeof r.data.count === 'number', r.data?.count);

    /* ---------------------------- prescriptions --------------------------- */
    group('Prescriptions');

    // Regression: this route was admin/pharmacist only, so a doctor's own
    // prescription list was permanently empty.
    r = await call('GET', '/api/prescriptions', { token: tokens.doctor });
    check('a doctor can list prescriptions', r.status === 200, r.data);

    r = await call('POST', '/api/prescriptions', {
      token: tokens.doctor,
      body: {
        patientId: cardio._id,
        diagnosis: 'Stable angina',
        medicines: [
          { medicineName: 'Atorvastatin', dosage: '10mg', frequency: 'Once daily', duration: '30 days', quantity: 30 }
        ]
      }
    });
    check('a doctor can write a prescription', r.status === 201, r.data);
    check('the prescription id follows the tenant pattern', /^TDEMO001-RX-\d{4}$/.test(r.data.prescription?.prescriptionId));
    const rxId = r.data.prescription._id;

    r = await call('POST', '/api/prescriptions', {
      token: tokens.doctor,
      body: {
        patientId: ortho._id, diagnosis: 'Out of department',
        medicines: [{ medicineName: 'Ibuprofen', dosage: '400mg', frequency: 'Twice daily', duration: '5 days', quantity: 10 }]
      }
    });
    check('a doctor cannot prescribe outside their department', r.status === 403, r.data);

    r = await call('POST', '/api/prescriptions', {
      token: tokens.reception,
      body: { patientId: cardio._id, diagnosis: 'x', medicines: [] }
    });
    check('a receptionist cannot prescribe', r.status === 403, r.data);

    r = await call('POST', '/api/prescriptions', {
      token: tokens.doctor,
      body: { patientId: cardio._id, diagnosis: 'No medicines', medicines: [] }
    });
    check('a prescription with no medicines is refused', r.status === 400, r.data);

    // New behaviour: prescribing something the patient is allergic to warns.
    const allergic = patients.find((p) => (p.allergies || []).includes('Penicillin'));
    r = await call('POST', '/api/prescriptions', {
      token: tokens.doctor,
      body: {
        patientId: allergic._id, diagnosis: 'Chest infection',
        medicines: [{ medicineName: 'Penicillin V', dosage: '250mg', frequency: 'Twice daily', duration: '7 days', quantity: 14 }]
      }
    });
    check('an allergy clash is flagged back to the prescriber', r.status === 201 && r.data.warnings?.length > 0, r.data?.warnings);

    /* ------------------------------- pharmacy ----------------------------- */
    group('Pharmacy and dispensing');

    r = await call('GET', '/api/pharmacy/medicines', { token: tokens.pharmacy });
    check('the inventory lists medicines', r.status === 200 && r.data.medicines.length > 0);
    check('stock value is computed', r.data.stats.stockValue > 0, r.data.stats);
    // Regression: the old controller lower-cased names before storing them.
    check('medicine names keep their capitalisation', r.data.medicines.some((m) => /^[A-Z]/.test(m.name)), r.data.medicines?.[0]?.name);

    r = await call('GET', '/api/pharmacy/medicines?lowStock=true', { token: tokens.pharmacy });
    // Regression: the filter compared against `undefined` and silently fell
    // back to a hard-coded threshold of 10.
    check(
      'the low-stock filter honours each medicine reorder level',
      r.data.medicines.length > 0 && r.data.medicines.every((m) => m.stockQuantity <= m.reorderLevel),
      r.data.medicines?.map((m) => [m.name, m.stockQuantity, m.reorderLevel])
    );

    r = await call('GET', `/api/prescriptions/${rxId}/stock-check`, { token: tokens.pharmacy });
    check('the pharmacist can check stock before dispensing', r.status === 200 && r.data.lines.length === 1, r.data);

    const stockBefore = (
      await call('GET', '/api/pharmacy/medicines?search=Atorvastatin', { token: tokens.pharmacy })
    ).data.medicines[0].stockQuantity;

    r = await call('POST', `/api/pharmacy/prescriptions/${rxId}/dispense`, { token: tokens.pharmacy, body: {} });
    check('dispensing succeeds', r.status === 200 && r.data.prescription.pharmacyStatus === 'Dispensed', r.data?.error);
    check('dispensing raises the pharmacy invoice', !!r.data.invoice?.invoiceId, r.data?.invoice?.invoiceId);

    const stockAfter = (
      await call('GET', '/api/pharmacy/medicines?search=Atorvastatin', { token: tokens.pharmacy })
    ).data.medicines[0].stockQuantity;
    check('stock is actually decremented', stockAfter === stockBefore - 30, { stockBefore, stockAfter });

    r = await call('POST', `/api/pharmacy/prescriptions/${rxId}/dispense`, { token: tokens.pharmacy, body: {} });
    check('the same prescription cannot be dispensed twice', r.status === 400, r.data);

    const cetirizine = (
      await call('GET', '/api/pharmacy/medicines?search=Cetirizine', { token: tokens.pharmacy })
    ).data.medicines[0];
    r = await call('PUT', `/api/pharmacy/medicines/${cetirizine._id}/stock`, {
      token: tokens.pharmacy, body: { stockQuantity: 50, mode: 'add' }
    });
    check('stock can be topped up with a delta', r.data?.medicine?.stockQuantity === cetirizine.stockQuantity + 50, r.data?.medicine?.stockQuantity);

    r = await call('PUT', `/api/pharmacy/medicines/${cetirizine._id}/stock`, {
      token: tokens.pharmacy, body: { stockQuantity: 999999, mode: 'remove' }
    });
    check('removing more stock than exists is refused', r.status === 400, r.data);

    /* -------------------------------- billing ----------------------------- */
    group('Billing');

    r = await call('GET', '/api/billing/invoices', { token: admin });
    check('the invoice list endpoint exists', r.status === 200 && r.data.invoices.length > 0);
    const unpaid = r.data.invoices.find((i) => i.balanceAmount > 0);

    r = await call('GET', '/api/billing/dashboard', { token: admin });
    check('the finance dashboard reports revenue', r.data?.dashboard?.totalRevenue > 0, r.data?.dashboard);
    check('the revenue trend is populated', r.data.dashboard.revenueTrend.length > 0);

    // Regression: the old endpoint accepted any paidAmount the client sent.
    r = await call('POST', `/api/billing/invoices/${unpaid._id}/payments`, {
      token: tokens.reception, body: { amount: 999999, method: 'Cash' }
    });
    check('a payment larger than the balance is refused', r.status === 400, r.data);

    r = await call('POST', `/api/billing/invoices/${unpaid._id}/payments`, {
      token: tokens.reception, body: { amount: -50, method: 'Cash' }
    });
    check('a negative payment is refused', r.status === 400, r.data);

    r = await call('POST', `/api/billing/invoices/${unpaid._id}/payments`, {
      token: tokens.reception, body: { amount: unpaid.balanceAmount, method: 'UPI' }
    });
    check('a valid payment settles the invoice', r.data?.invoice?.paymentStatus === 'Paid', r.data);

    r = await call('POST', '/api/billing/invoices', {
      token: tokens.reception,
      body: {
        patientId: cardio._id,
        // `amount` is deliberately wrong: the server must recompute it.
        items: [{ itemName: 'MRI scan', itemType: 'Test', quantity: 2, unitPrice: 3000, amount: 1 }],
        taxPercentage: 5
      }
    });
    check(
      'invoice totals are recomputed server-side, ignoring a forged amount',
      r.status === 201 && r.data.invoice.subTotal === 6000 && r.data.invoice.totalAmount === 6300,
      r.data?.invoice
    );

    r = await call('POST', '/api/billing/invoices', {
      token: tokens.nurse, body: { patientId: cardio._id, items: [] }
    });
    check('a nurse cannot raise invoices', r.status === 403, r.data);

    /* --------------------------------- staff ------------------------------ */
    group('Staff and roles');

    r = await call('POST', '/api/users', {
      token: admin,
      body: {
        firstName: 'New', lastName: 'Doctor', email: 'new.doctor@careease.health',
        phone: '9800000099', department: 'Cardiology', roles: ['DOCTOR']
      }
    });
    check('an admin can create a staff account', r.status === 201, r.data);
    check('a temporary password is returned once', !!r.data.temporaryPassword);
    check('the response never contains the password hash', !r.data.user.password);
    const tempPassword = r.data.temporaryPassword;
    const newUserId = r.data.user._id;

    r = await call('POST', '/api/auth/login', {
      body: { email: 'new.doctor@careease.health', password: tempPassword, tenantId: TENANT }
    });
    // Regression: the old code hashed the password by hand in each controller,
    // so a path that forgot to could store it in plain text.
    check('the generated password actually signs in', r.status === 200, r.data);
    check('the new account is flagged to change its password', r.data.user?.mustChangePassword === true);

    r = await call('POST', '/api/users', {
      token: admin,
      body: {
        firstName: 'Dup', lastName: 'Email', email: 'new.doctor@careease.health',
        phone: '9800000098', department: 'Cardiology', roles: ['DOCTOR']
      }
    });
    // Regression: this used to surface as a raw Mongo E11000 inside a 500.
    check('a duplicate staff e-mail is a clean 409', r.status === 409, r.data);

    r = await call('POST', '/api/users', { token: tokens.doctor, body: { firstName: 'x' } });
    check('a non-admin cannot create staff', r.status === 403);

    r = await call('DELETE', `/api/users/${newUserId}`, { token: admin });
    check('a staff account can be removed', r.status === 200, r.data);

    const adminId = (await call('GET', '/api/auth/me', { token: admin })).data.user.id;
    r = await call('DELETE', `/api/users/${adminId}`, { token: admin });
    check('an admin cannot delete their own account', r.status === 400, r.data);

    r = await call('PUT', `/api/users/${adminId}`, { token: admin, body: { status: 'INACTIVE' } });
    check('an admin cannot lock themselves out', r.status === 400, r.data);

    /* ------------------------------- passwords ---------------------------- */
    group('Password policy');

    r = await call('POST', '/api/auth/change-password', {
      token: tokens.nurse, body: { currentPassword: 'Nurse@123', newPassword: 'weak' }
    });
    check('a weak new password is refused', r.status === 400, r.data);

    r = await call('POST', '/api/auth/change-password', {
      token: tokens.nurse, body: { currentPassword: 'wrong', newPassword: 'Stronger@456' }
    });
    check('the wrong current password is refused', r.status === 401, r.data);

    r = await call('POST', '/api/auth/change-password', {
      token: tokens.nurse, body: { currentPassword: 'Nurse@123', newPassword: 'Stronger@456' }
    });
    check('a valid password change succeeds', r.status === 200, r.data);

    r = await call('POST', '/api/auth/login', {
      body: { email: 'nurse@careease.health', password: 'Stronger@456', tenantId: TENANT }
    });
    check('the new password works immediately', r.status === 200);

    r = await call('POST', '/api/auth/login', {
      body: { email: 'nurse@careease.health', password: 'Nurse@123', tenantId: TENANT }
    });
    check('the old password stops working', r.status === 401);

    /* ---------------------------- wards and beds -------------------------- */
    group('Wards, beds and admissions');

    r = await call('GET', '/api/wards', { token: admin });
    check('the ward list is served', r.status === 200 && r.data.count === 7, r.data?.count);
    check('bed counts are aggregated per ward', r.data.totals.beds === 60, r.data?.totals);
    check('occupancy is derived from occupied beds', r.data.totals.occupied === 6, r.data?.totals);
    check('beds out of service are counted separately', r.data.totals.outOfService > 0, r.data?.totals);
    const wardId = r.data.wards.find((w) => w.bedCounts.Available > 0)._id;

    r = await call('GET', `/api/wards/${wardId}`, { token: admin });
    check('a ward serves its bed board', r.status === 200 && r.data.beds.length > 0, r.data?.beds?.length);

    r = await call('GET', '/api/beds/available', { token: tokens.reception });
    check('the free-bed picker works', r.status === 200 && r.data.count > 0, r.data?.count);
    check('free beds carry a human label', /\s\/\s/.test(r.data.beds[0].label), r.data?.beds?.[0]);
    const freeBed = r.data.beds[0];

    // An outpatient with no open stay, so the admission is a clean one.
    const admitCandidate = patients.find(
      (p) => p.patientType === 'OPD' && p.department === 'Cardiology'
    );

    r = await call('POST', '/api/admissions', {
      token: tokens.reception,
      body: { patientId: admitCandidate._id, bedId: freeBed._id, reason: 'Observation overnight' }
    });
    check('a patient can be admitted', r.status === 201, r.data);
    check('the admission id follows the tenant pattern', /^TDEMO001-ADM-\d{4}$/.test(r.data.admission?.admissionId), r.data.admission?.admissionId);
    const stayId = r.data.admission._id;

    r = await call('GET', `/api/wards/${freeBed.ward._id}`, { token: admin });
    const takenBed = r.data.beds.find((b) => String(b._id) === String(freeBed._id));
    check('the bed is now marked occupied', takenBed?.status === 'Occupied', takenBed?.status);
    check('the bed shows who is in it', takenBed?.currentPatient?._id === admitCandidate._id, takenBed?.currentPatient);

    r = await call('GET', `/api/patients/${admitCandidate._id}`, { token: admin });
    check('the patient record flips to IPD', r.data.patient.patientType === 'IPD', r.data.patient?.patientType);
    check('the patient record records the bed', !!r.data.patient.roomNumber, r.data.patient?.roomNumber);

    r = await call('POST', '/api/admissions', {
      token: tokens.reception,
      body: { patientId: admitCandidate._id, bedId: freeBed._id, reason: 'Again' }
    });
    check('the same bed cannot be given to two patients', r.status === 409, r.data);

    const anotherBed = (await call('GET', '/api/beds/available', { token: admin })).data.beds[0];
    r = await call('POST', '/api/admissions', {
      token: tokens.reception,
      body: { patientId: admitCandidate._id, bedId: anotherBed._id, reason: 'Double admission' }
    });
    check('a patient cannot be admitted twice at once', r.status === 409, r.data);

    r = await call('POST', '/api/admissions', {
      token: tokens.reception,
      body: { patientId: admitCandidate._id, bedId: anotherBed._id }
    });
    check('an admission without a reason is refused', r.status === 400, r.data);

    r = await call('POST', `/api/admissions/${stayId}/transfer`, {
      token: tokens.nurse,
      body: { bedId: anotherBed._id, reason: 'Closer to the nursing station' }
    });
    check('a patient can be moved to another bed', r.status === 200, r.data);

    r = await call('GET', `/api/wards/${freeBed.ward._id}`, { token: admin });
    const vacated = r.data.beds.find((b) => String(b._id) === String(freeBed._id));
    check('the bed left behind is freed', vacated?.status === 'Available', vacated?.status);

    r = await call('GET', `/api/admissions/${stayId}`, { token: admin });
    check('the move is recorded on the stay', r.data.admission.transfers.length === 1, r.data.admission?.transfers);

    r = await call('POST', `/api/admissions/${stayId}/transfer`, {
      token: tokens.nurse, body: { bedId: anotherBed._id }
    });
    check('moving a patient into their own bed is refused', r.status === 400, r.data);

    // A bed in use must not be quietly flipped by the bed editor.
    r = await call('PUT', `/api/beds/${anotherBed._id}`, {
      token: admin, body: { status: 'Maintenance' }
    });
    check('an occupied bed cannot be taken out of service', r.status === 400, r.data);

    r = await call('DELETE', `/api/beds/${anotherBed._id}`, { token: admin });
    check('an occupied bed cannot be deleted', r.status === 400, r.data);

    r = await call('DELETE', `/api/wards/${anotherBed.ward._id}`, { token: admin });
    check('a ward with occupied beds cannot be deleted', r.status === 400, r.data);

    r = await call('POST', `/api/admissions/${stayId}/discharge`, {
      token: tokens.nurse, body: { dischargeSummary: 'Stable, sent home.' }
    });
    check('a patient can be discharged', r.status === 200, r.data);
    check('discharge raises the room invoice', !!r.data.invoice?.invoiceId, r.data?.invoice);
    check(
      'room charges are nights x nightly rate plus tax',
      Math.abs(r.data.invoice.subTotal - r.data.invoice.items[0].quantity * r.data.invoice.items[0].unitPrice) < 0.01,
      r.data.invoice?.items
    );

    r = await call('GET', `/api/wards/${anotherBed.ward._id}`, { token: admin });
    const releasedBed = r.data.beds.find((b) => String(b._id) === String(anotherBed._id));
    check('discharge frees the bed', releasedBed?.status === 'Available', releasedBed?.status);
    check('discharge clears the occupant', !releasedBed?.currentPatient, releasedBed?.currentPatient);

    r = await call('POST', `/api/admissions/${stayId}/discharge`, { token: tokens.nurse, body: {} });
    check('a closed stay cannot be discharged twice', r.status === 400, r.data);

    r = await call('POST', '/api/wards', {
      token: admin,
      body: { name: 'Test Ward', code: 'TSTW', department: 'General', dailyRate: 1000, bedCount: 4, bedPrefix: 'T' }
    });
    check('an admin can create a ward with its beds', r.status === 201 && r.data.beds.length === 4, r.data?.beds?.length);
    const testWardId = r.data.ward._id;

    r = await call('POST', '/api/wards', {
      token: admin, body: { name: 'Clash', code: 'TSTW', department: 'General' }
    });
    check('a duplicate ward code is refused', r.status === 409, r.data);

    r = await call('POST', '/api/wards', { token: tokens.nurse, body: { name: 'x', code: 'NURS' } });
    check('a nurse cannot create wards', r.status === 403, r.data);

    r = await call('DELETE', `/api/wards/${testWardId}`, { token: admin });
    check('an empty ward can be deleted', r.status === 200, r.data);

    /* --------------------------------- vitals ----------------------------- */
    group('Vitals');

    const vitalsPatient = patients.find((p) => p.department === 'Cardiology' && p.patientType === 'IPD');

    r = await call('GET', `/api/patients/${vitalsPatient._id}/vitals`, { token: tokens.nurse });
    check('seeded observations are returned', r.status === 200 && r.data.count > 0, r.data?.count);
    check('a trend series is built for charting', r.data.trend.length === r.data.count, r.data?.trend?.length);
    check('reference ranges are served with the readings', !!r.data.referenceRanges?.pulse, r.data?.referenceRanges);

    r = await call('POST', `/api/patients/${vitalsPatient._id}/vitals`, {
      token: tokens.nurse,
      body: { temperature: 36.8, pulse: 74, systolic: 118, diastolic: 76, oxygenSaturation: 98 }
    });
    check('a nurse can record vitals', r.status === 201, r.data);
    check('a normal reading is flagged as normal', r.data.assessment.abnormalCount === 0, r.data?.assessment);
    const normalReadingId = r.data.vitals._id;

    r = await call('POST', `/api/patients/${vitalsPatient._id}/vitals`, {
      token: tokens.nurse,
      body: { temperature: 39.8, pulse: 138, systolic: 190, diastolic: 125, oxygenSaturation: 88 }
    });
    check('a dangerous reading is marked critical', r.data.assessment?.hasCritical === true, r.data?.assessment);
    check('the critical summary names the values', r.data.assessment.summary.length >= 4, r.data?.assessment?.summary);

    r = await call('POST', `/api/patients/${vitalsPatient._id}/vitals`, {
      token: tokens.nurse, body: {} });
    check('an empty reading is refused', r.status === 400, r.data);

    r = await call('POST', `/api/patients/${vitalsPatient._id}/vitals`, {
      token: tokens.nurse, body: { systolic: 120 } });
    check('half a blood pressure is refused', r.status === 400, r.data);

    r = await call('POST', `/api/patients/${vitalsPatient._id}/vitals`, {
      token: tokens.nurse, body: { systolic: 80, diastolic: 120 } });
    check('an inverted blood pressure is refused', r.status === 400, r.data);

    r = await call('POST', `/api/patients/${vitalsPatient._id}/vitals`, {
      token: tokens.nurse, body: { pulse: 'quite fast' } });
    check('a non-numeric measurement is refused', r.status === 400, r.data);

    // The department rule applies to observations as much as to records.
    const otherDeptPatient = patients.find((p) => p.department === 'Orthopedics');
    r = await call('POST', `/api/patients/${otherDeptPatient._id}/vitals`, {
      token: tokens.nurse, body: { pulse: 80 } });
    check('a nurse cannot record vitals outside their department', r.status === 403, r.data);

    r = await call('GET', '/api/vitals/attention', { token: tokens.nurse });
    check('the nurse worklist is served', r.status === 200 && Array.isArray(r.data.attention), r.data);
    check('the worklist is department-scoped', r.data.inpatients > 0 && r.data.inpatients < 6, r.data?.inpatients);

    r = await call('DELETE', `/api/vitals/${normalReadingId}`, { token: tokens.reception });
    check('someone else cannot delete a reading', r.status === 403 || r.status === 404, r.data);

    r = await call('DELETE', `/api/vitals/${normalReadingId}`, { token: tokens.nurse });
    check('the person who recorded a reading can remove it', r.status === 200, r.data);

    /* -------------------------------- reports ----------------------------- */
    group('Reports');

    r = await call('GET', '/api/reports?from=2026-01-01&to=2026-12-31', { token: admin });
    check('the report endpoint works', r.status === 200, r.data);
    check('the range is echoed back', r.data.range?.days > 300, r.data?.range);
    check('revenue is summarised', r.data.summary.revenueCollected > 0, r.data?.summary?.revenueCollected);
    check('a comparison window is provided', !!r.data.range.comparedWith?.from, r.data?.range?.comparedWith);
    check('revenue is broken down by day', r.data.revenueByDay.length > 0, r.data?.revenueByDay?.length);
    check('revenue is broken down by category', r.data.revenueByCategory.length > 1, r.data?.revenueByCategory);
    check('payment methods are summarised', r.data.paymentMethods.length > 0, r.data?.paymentMethods);
    check('doctor workload is reported', r.data.doctorWorkload.length > 0, r.data?.doctorWorkload?.length);
    check('a completion rate is computed per doctor', typeof r.data.doctorWorkload[0].completionRate === 'number', r.data?.doctorWorkload?.[0]);
    check('the most prescribed medicines are listed', r.data.topMedicines.length > 0, r.data?.topMedicines?.length);
    check('admissions and average stay are reported', r.data.summary.admissions > 0 && r.data.summary.averageLengthOfStay > 0, r.data?.summary);

    r = await call('GET', '/api/reports', { token: admin });
    check('the report defaults to the current month', r.status === 200, r.data?.error);

    r = await call('GET', '/api/reports?from=2026-12-31&to=2026-01-01', { token: admin });
    check('a backwards date range is refused', r.status === 400, r.data);

    r = await call('GET', '/api/reports?from=2020-01-01&to=2026-12-31', { token: admin });
    check('an unreasonably long range is refused', r.status === 400, r.data);

    r = await call('GET', '/api/reports', { token: tokens.nurse });
    check('a nurse cannot read the reports', r.status === 403, r.data);

    /* --------------------- dashboard now reads real beds ------------------ */
    group('Dashboard occupancy from the bed register');

    r = await call('GET', '/api/dashboard/stats', { token: admin });
    check('occupancy comes from the bed register', r.data.stats.bedSource === 'wards', r.data?.stats?.bedSource);
    check('capacity is the number of real beds', r.data.stats.bedCapacity === 60, r.data?.stats?.bedCapacity);
    check(
      'occupied plus available never exceeds capacity',
      r.data.stats.occupiedBeds + r.data.stats.availableBeds <= r.data.stats.bedCapacity,
      r.data?.stats
    );

    /* ------------------------------ search / misc ------------------------- */
    group('Search and error handling');

    r = await call('GET', '/api/search?q=Amit', { token: admin });
    check('global search finds a patient', r.status === 200 && r.data.results.length > 0, r.data);

    r = await call('GET', '/api/search?q=c%2B%2B', { token: admin });
    // Regression: user input went straight into a RegExp.
    check('regex metacharacters in a search do not crash the server', r.status === 200, r.data);

    r = await call('GET', '/api/patients/not-a-valid-id', { token: admin });
    check('a malformed object id is a 400, not a 500', r.status === 400, r.data);

    r = await call('GET', '/api/does-not-exist', { token: admin });
    check('an unknown route returns a clean 404', r.status === 404 && r.data.error === 'Route not found', r.data);

    /* --------------------------- tenant isolation ------------------------- */
    group('Tenant isolation');

    const User = require(path.join(ROOT, 'models', 'User'));
    const Patient = require(path.join(ROOT, 'models', 'Patient'));

    await User.create({
      firstName: 'Other', lastName: 'Admin', email: 'other@other.health', phone: '9000000000',
      password: 'Other@123', department: 'Administration', roles: ['HOSPITAL_ADMIN'],
      tenantId: 'TOTHER01', status: 'ACTIVE'
    });
    await Patient.create({
      firstName: 'Hidden', lastName: 'Person', dateOfBirth: new Date('1990-01-01'),
      gender: 'Male', phone: '9111111111', department: 'General', tenantId: 'TOTHER01'
    });

    const other = await call('POST', '/api/auth/login', {
      body: { email: 'other@other.health', password: 'Other@123', tenantId: 'TOTHER01' }
    });
    check('a second hospital can sign in', other.status === 200);

    r = await call('GET', '/api/patients', { token: other.data.token });
    check('the second hospital sees only its own patient', r.data.patients.length === 1, r.data?.patients?.length);

    r = await call('GET', `/api/patients/${cardio._id}`, { token: other.data.token });
    check('a cross-tenant record read is blocked', r.status === 404, r.data);

    r = await call('GET', '/api/dashboard/stats', { token: other.data.token });
    check('dashboard figures do not leak across tenants', r.data.stats.totalPatients === 1, r.data?.stats?.totalPatients);
  } finally {
    console.log('\n  ' + '-'.repeat(50));
    console.log(`  ${passed} passed, ${failed} failed`);
    if (failed) {
      console.log('\n  failures:');
      failures.forEach((name) => console.log(`   - ${name}`));
    }
    console.log('  ' + '-'.repeat(50) + '\n');

    await finish();
  }

  process.exit(failed ? 1 : 0);
};

run().catch(async (error) => {
  console.error('\n  the test run crashed:', error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
