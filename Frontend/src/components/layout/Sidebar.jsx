// src/components/layout/Sidebar.jsx
import React, { useMemo } from 'react'; // ✅ ADD useMemo
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Users,
  Stethoscope,
  Calendar,
  FileText,
  Pill,
  CreditCard,
  Shield,
  Building2,
  BarChart3,
  X
} from 'lucide-react';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user } = useAuth();
  const { hasRole } = usePermissions();
  const location = useLocation();

  // Menu items with permissions
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: BarChart3,
      roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST']
    },
    {
      name: 'User Management',
      path: '/admin/users',
      icon: Users,
      roles: ['HOSPITAL_ADMIN', 'DOCTOR']
    },
    {
      name: 'Patient Management',
      path: '/patients',
      icon: Stethoscope,
      roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']
    },
    {
      name: 'Appointments',
      path: '/appointments',
      icon: Calendar,
      roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']
    },
    {
      name: 'Prescriptions',
      path: '/prescriptions',
      icon: FileText,
      roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'PHARMACIST']
    },
    {
      name: 'Pharmacy',
      path: '/pharmacy',
      icon: Pill,
      roles: ['HOSPITAL_ADMIN', 'PHARMACIST']
    },
    {
      name: 'Billing',
      path: '/billing',
      icon: CreditCard,
      roles: ['HOSPITAL_ADMIN', 'RECEPTIONIST']
    },
    {
      name: 'Role Management',
      path: '/admin/roles',
      icon: Shield,
      roles: ['HOSPITAL_ADMIN']
    },
    {
      name: 'Hospital Settings',
      path: '/admin/settings',
      icon: Building2,
      roles: ['HOSPITAL_ADMIN']
    }
  ];

  // ✅ useMemo use karo to prevent re-renders
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => hasRole(item.roles));
  }, [hasRole]); // ✅ Only recalculate when hasRole changes

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 flex z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 flex flex-col z-50 bg-white w-64 border-r border-gray-200 transform transition duration-300 ease-in-out 
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-cyan-600">CareEase HMS</h1>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-cyan-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName || 'Admin'} {user?.lastName || 'User'}
              </p>
              <p className="text-sm text-gray-500 truncate capitalize">
                {user?.roles?.[0]?.toLowerCase().replace('_', ' ') || 'hospital admin'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                  ${active
                    ? 'bg-cyan-50 text-cyan-700 border-r-2 border-cyan-600'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`
                  flex-shrink-0 h-5 w-5 mr-3
                  ${active ? 'text-cyan-600' : 'text-gray-400 group-hover:text-gray-500'}
                `} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {user?.hospitalName || 'Medenta Hospital'}
              </p>
              <p className="text-xs text-gray-500 font-mono">
                {user?.tenantId || 'HOSPITAL_001'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;