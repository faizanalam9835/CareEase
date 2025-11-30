// src/AppRoutes.jsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Login from '../Pages/auth/Login'
import LandingPage from '../Pages/LandingPage'
import HospitalRegister from '../Pages/auth/HospitalRegister'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import Layout from '../components/layout/Layout'

// Lazy loaded components
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
      <div className="min-h-screen bg-gradient-to-br from-[#b2ebf2] to-cyan-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-cyan-800 font-medium">Loading CareEase HMS...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path='/' element={<LandingPage />} />
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />
        <Route path="/hospital-register" element={<HospitalRegister />} />

        {/* ✅ CORRECTED: Protected Routes with Layout */}
        <Route 
          path="/"  // ✅ "/*" use karo instead of "/"
          element={
            user ? <Layout /> : <Navigate to="/login" replace />
          }
        >
          {/* ✅ REMOVE the extra <Route path="/" element={<Layout />}> wrapper */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard */}
          <Route path="dashboard" element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST']}>
              <React.Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                </div>
              }>
                <AdminDashboard />
              </React.Suspense>
            </ProtectedRoute>
          } />
          
          {/* User Management */}
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR']}>
              <React.Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                </div>
              }>
                <UserManagement />
              </React.Suspense>
            </ProtectedRoute>
          } />
          
          {/* Patient Management */}
          <Route path="patients" element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
              <React.Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                </div>
              }>
                <Patients />
              </React.Suspense>
            </ProtectedRoute>
          } />
          
          {/* Appointments */}
          <Route path="appointments" element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
              <React.Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                </div>
              }>
                <Appointments />
              </React.Suspense>
            </ProtectedRoute>
          } />
          
          {/* Prescriptions */}
          <Route path="prescriptions" element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'PHARMACIST']}>
              <React.Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                </div>
              }>
                <Prescriptions />
              </React.Suspense>
            </ProtectedRoute>
          } />
          
          {/* Pharmacy */}
          <Route path="pharmacy" element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'PHARMACIST']}>
              <React.Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                </div>
              }>
                <Pharmacy />
              </React.Suspense>
            </ProtectedRoute>
          } />
          
          {/* Billing */}
          <Route path="billing" element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST']}>
              <React.Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                </div>
              }>
                <Billing />
              </React.Suspense>
            </ProtectedRoute>
          } />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default AppRoutes