// src/AppRoutes.jsx
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

import Login from '../Pages/auth/Login'
import LandingPage from '../Pages/LandingPage'
import HospitalRegister from '../Pages/auth/HospitalRegister'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import Layout from '../components/layout/Layout'

// Lazy components
const AdminDashboard = React.lazy(() => import('../Pages/dashboard/AdminDashboard'))
const UserManagement = React.lazy(() => import('../Pages/Admin/UserManagement/UserManagement'))
const Patients = React.lazy(() => import('../Pages/patients/Patients'))
const Appointments = React.lazy(() => import('../Pages/appointments/Appointments'))
const Prescriptions = React.lazy(() => import('../Pages/prescriptions/Prescriptions'))
const Pharmacy = React.lazy(() => import('../Pages/pharmacy/Pharmacy'))
const Billing = React.lazy(() => import('../Pages/billing/Billing'))

const AppRoutes = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-cyan-800 font-medium">Loading CareEase HMS...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/hospital-register" element={<HospitalRegister />} />
      <Route path="/login" element={<Login />} />

      {/* PROTECTED ROUTES */}
      <Route
        path="/"
        element={user ? <Layout /> : <Navigate to="/login" replace />}
      >
     

        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST']}>
              <React.Suspense fallback={<Loader />}>
                <AdminDashboard />
              </React.Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR']}>
              <React.Suspense fallback={<Loader />}>
                <UserManagement />
              </React.Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="patients"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
              <React.Suspense fallback={<Loader />}>
                <Patients />
              </React.Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="appointments"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
              <React.Suspense fallback={<Loader />}>
                <Appointments />
              </React.Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="prescriptions"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'PHARMACIST']}>
              <React.Suspense fallback={<Loader />}>
                <Prescriptions />
              </React.Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="pharmacy"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'PHARMACIST']}>
              <React.Suspense fallback={<Loader />}>
                <Pharmacy />
              </React.Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="billing"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST']}>
              <React.Suspense fallback={<Loader />}>
                <Billing />
              </React.Suspense>
            </ProtectedRoute>
          }
        />

        {/* CATCH ALL for protected area */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* GLOBAL CATCH ALL - for public area */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Loader Component
const Loader = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
  </div>
)

export default AppRoutes
