/**
 * The demo tenant and its sign-in accounts.
 *
 * Shared by the seeder (which creates them) and by
 * `GET /api/auth/demo-credentials` (which lists them on the login screen), so
 * the two can never drift apart.
 */

import type { Department, Role } from '../config/constants';

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

export { DEMO_TENANT_ID, DEMO_ACCOUNTS };
