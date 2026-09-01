import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  FileText,
  Pill,
  Receipt,
  Building2,
  UserCog,
  BedDouble,
  FileBarChart
} from 'lucide-react';

/**
 * One definition of the application menu, shared by the sidebar and the
 * dashboard's quick actions, so a link can never appear in one and not the
 * other. `roles` mirrors what the API will actually allow.
 */
export const NAV_ITEMS = [
  {
    name: 'Dashboard',
    path: '/app/dashboard',
    icon: LayoutDashboard,
    roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST'],
    description: 'Overview of today'
  },
  {
    name: 'Patients',
    path: '/app/patients',
    icon: Stethoscope,
    roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
    description: 'Registry and history'
  },
  {
    name: 'Appointments',
    path: '/app/appointments',
    icon: CalendarDays,
    roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
    description: 'Schedule and bookings'
  },
  {
    name: 'Wards',
    path: '/app/wards',
    icon: BedDouble,
    roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
    description: 'Beds, admissions and discharges'
  },
  {
    name: 'Prescriptions',
    path: '/app/prescriptions',
    icon: FileText,
    roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'],
    description: 'Diagnoses and medication'
  },
  {
    name: 'Pharmacy',
    path: '/app/pharmacy',
    icon: Pill,
    roles: ['HOSPITAL_ADMIN', 'PHARMACIST', 'DOCTOR'],
    description: 'Stock and dispensing'
  },
  {
    name: 'Billing',
    path: '/app/billing',
    icon: Receipt,
    roles: ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST'],
    description: 'Invoices and payments'
  },
  {
    name: 'Reports',
    path: '/app/reports',
    icon: FileBarChart,
    roles: ['HOSPITAL_ADMIN', 'RECEPTIONIST'],
    description: 'Analytics and exports'
  },
  {
    name: 'Staff',
    path: '/app/staff',
    icon: Users,
    roles: ['HOSPITAL_ADMIN'],
    description: 'Accounts and roles'
  },
  {
    name: 'Hospital',
    path: '/app/settings',
    icon: Building2,
    roles: ['HOSPITAL_ADMIN'],
    description: 'Profile and configuration'
  },
  {
    name: 'My account',
    path: '/app/profile',
    icon: UserCog,
    roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST'],
    description: 'Details and password',
    hideFromQuickActions: true
  }
];

export const navFor = (roles = []) =>
  NAV_ITEMS.filter((item) => item.roles.some((role) => roles.includes(role)));

export const ROLE_LABELS = {
  HOSPITAL_ADMIN: 'Hospital administrator',
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  PHARMACIST: 'Pharmacist',
  RECEPTIONIST: 'Receptionist'
};

/** Where each role lands after signing in. */
export const HOME_PATH = '/app/dashboard';
