import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import Login from '../Pages/auth/Login'
import LandingPage from '../Pages/LandingPage'
import HospitalRegister from '../Pages/auth/HospitalRegister'
import Verify from '../Pages/Verify'

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
    console.log("🔥 AppRoutes mounted")
  if (loading) return <Loader />
  console.log("AUTH USER:", user)
  return (
    <Routes>
    
      {/* 🌍 PUBLIC ROUTES */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/app/dashboard" />} />
      <Route path="/hospital-register" element={<HospitalRegister />} />
      <Route path="/verify/:token" element={<Verify />} />

      {/* 🔐 PROTECTED ROUTES */}
      <Route
        path="/app"
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

        {/* 🔁 Protected fallback */}
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Route>

      {/* 🌐 Global fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  )
}

const Loader = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
  </div>
)

export default AppRoutes
