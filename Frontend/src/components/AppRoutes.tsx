import React, { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './layout/Layout';
import ProtectedRoute from './layout/ProtectedRoute';
import { LoadingState } from './ui';
import { homePath } from '../lib/navigation';
import type { Role } from '../types';

import LandingPage from '../Pages/LandingPage';
import Login from '../Pages/auth/Login';

// Everything behind the sign-in is loaded on demand, so the landing page and
// login screen stay small.
const Dashboard = React.lazy(() => import('../Pages/dashboard/Dashboard'));
const Patients = React.lazy(() => import('../Pages/patients/Patients'));
const Appointments = React.lazy(() => import('../Pages/appointments/Appointments'));
const CallLogs = React.lazy(() => import('../Pages/calls/CallLogs'));
const Prescriptions = React.lazy(() => import('../Pages/prescriptions/Prescriptions'));
const Pharmacy = React.lazy(() => import('../Pages/pharmacy/Pharmacy'));
const Billing = React.lazy(() => import('../Pages/billing/Billing'));
const StaffManagement = React.lazy(() => import('../Pages/staff/StaffManagement'));
const Wards = React.lazy(() => import('../Pages/wards/Wards'));
const Reports = React.lazy(() => import('../Pages/reports/Reports'));
const Profile = React.lazy(() => import('../Pages/profile/Profile'));
const HospitalSettings = React.lazy(() => import('../Pages/settings/HospitalSettings'));
const Platform = React.lazy(() => import('../Pages/platform/Platform'));

const Lazy = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<LoadingState label="Loading page" className="py-24" />}>{children}</Suspense>
);

const guard = (roles: Role[], element: ReactNode) => (
  <ProtectedRoute allowedRoles={roles}>
    <Lazy>{element}</Lazy>
  </ProtectedRoute>
);

const CLINICAL: Role[] = ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];
const EVERYONE: Role[] = [...CLINICAL, 'PHARMACIST'];

const AppRoutes = () => {
  const { user, loading } = useAuth();

  // Waiting for the stored session to be revalidated. Rendering the routes
  // first would bounce an already-signed-in user to /login on every refresh.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingState label="Starting CareEase" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={homePath(user.roles)} replace /> : <Login />} />
      {/* Old self-signup links: hospitals are onboarded by the platform team now. */}
      <Route path="/hospital-register" element={<Navigate to="/#contact" replace />} />

      {/* Signed in */}
      <Route path="/app" element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to={homePath(user?.roles)} replace />} />
        <Route path="platform" element={guard(['SUPER_ADMIN'], <Platform />)} />
        <Route path="dashboard" element={guard(EVERYONE, <Dashboard />)} />
        <Route path="patients" element={guard(CLINICAL, <Patients />)} />
        <Route path="appointments" element={guard(CLINICAL, <Appointments />)} />
        <Route path="calls" element={guard(['HOSPITAL_ADMIN', 'RECEPTIONIST'], <CallLogs />)} />
        <Route
          path="prescriptions"
          element={guard(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'], <Prescriptions />)}
        />
        <Route
          path="pharmacy"
          element={guard(['HOSPITAL_ADMIN', 'PHARMACIST', 'DOCTOR'], <Pharmacy />)}
        />
        <Route
          path="billing"
          element={guard(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST'], <Billing />)}
        />
        <Route path="wards" element={guard(CLINICAL, <Wards />)} />
        <Route
          path="reports"
          element={guard(['HOSPITAL_ADMIN', 'RECEPTIONIST'], <Reports />)}
        />
        <Route path="staff" element={guard(['HOSPITAL_ADMIN'], <StaffManagement />)} />
        <Route path="settings" element={guard(['HOSPITAL_ADMIN'], <HospitalSettings />)} />
        <Route path="profile" element={guard([...EVERYONE, 'SUPER_ADMIN'], <Profile />)} />

        {/* The old build linked to /app/admin/users; keep those URLs alive. */}
        <Route path="admin/users" element={<Navigate to="/app/staff" replace />} />
        <Route path="admin/settings" element={<Navigate to="/app/settings" replace />} />

        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
