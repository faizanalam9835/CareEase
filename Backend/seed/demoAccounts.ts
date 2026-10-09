/**
 * The demo tenant and its sign-in accounts.
 *
 * Shared by the seeder (which creates them) and by
 * `GET /api/auth/demo-credentials` (which lists them on the login screen), so
 * the two can never drift apart.
 */

import User from '../models/User';
import { PLATFORM_TENANT_ID, type Department, type Role } from '../config/constants';

export interface DemoAccount {
  role: Role;
  label: string;
  email: string;
  password: string;
  department: Department;
  description: string;
}

const DEMO_TENANT_ID = 'TDEMO001';

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'HOSPITAL_ADMIN',
    label: 'Hospital Administrator',
    email: 'admin@careease.health',
    password: 'Admin@123',
    department: 'Administration',
    description: 'Full access: staff, patients, billing, pharmacy and reports.'
  },
  {
    role: 'DOCTOR',
    label: 'Doctor (Cardiology)',
    email: 'doctor@careease.health',
    password: 'Doctor@123',
    department: 'Cardiology',
    description: 'Sees Cardiology patients only, writes prescriptions.'
  },
  {
    role: 'NURSE',
    label: 'Nurse (Cardiology)',
    email: 'nurse@careease.health',
    password: 'Nurse@123',
    department: 'Cardiology',
    description: 'Read-only clinical view of the Cardiology ward.'
  },
  {
    role: 'RECEPTIONIST',
    label: 'Receptionist',
    email: 'reception@careease.health',
    password: 'Reception@123',
    department: 'Administration',
    description: 'Registers patients, books appointments, raises invoices.'
  },
  {
    role: 'PHARMACIST',
    label: 'Pharmacist',
    email: 'pharmacy@careease.health',
    password: 'Pharmacy@123',
    department: 'Pharmacy',
    description: 'Manages medicine stock and dispenses prescriptions.'
  }
];

/** The CareEase platform admin. Belongs to no hospital; it onboards them. */
const DEMO_PLATFORM_ADMIN: DemoAccount = {
  role: 'SUPER_ADMIN',
  label: 'Super Admin (platform)',
  email: 'superadmin@careease.health',
  password: 'Super@123',
  department: 'Administration',
  description: 'CareEase team: onboards and suspends hospitals. Sees no patient data.'
};

/**
 * Creates the demo platform admin if it is missing. Run by the seeder, and by
 * the API on its first database connection while DEMO_MODE is on, so a deployed
 * demo has the account without anyone running the seeder against production.
 */
const ensureDemoPlatformAdmin = async (): Promise<void> => {
  const { email, password, department, role } = DEMO_PLATFORM_ADMIN;
  if (await User.exists({ tenantId: PLATFORM_TENANT_ID, email })) return;
  await User.create({
    firstName: 'CareEase',
    lastName: 'Super Admin',
    email,
    phone: '0000000000',
    password,
    department,
    designation: 'Platform administrator',
    roles: [role],
    tenantId: PLATFORM_TENANT_ID,
    status: 'ACTIVE'
  }).catch((error: { code?: number }) => {
    if (error.code !== 11000) throw error; // another instance created it first
  });
};

export { DEMO_TENANT_ID, DEMO_ACCOUNTS, DEMO_PLATFORM_ADMIN, ensureDemoPlatformAdmin };
