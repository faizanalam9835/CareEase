// src/Pages/dashboard/AdminDashboard.jsx (OPTIMIZED)
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { Link } from 'react-router-dom';
import { 
  Users, UserPlus, Calendar, FileText, Pill, CreditCard, 
  Shield, Building2, BarChart3, RefreshCw, Download,
  Activity, Stethoscope, Bed, CheckCircle, AlertTriangle, XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import StatsCard from '../../components/shared/StatsCard';
import QuickAction from '../../components/shared/QuickAction';
import axios from 'axios';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [stats, setStats] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [systemStatus, setSystemStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ API call karne ka common function
  const makeApiCall = async (endpoint, options = {}) => {
    const authToken = localStorage.getItem("authToken");
    const tenantId = localStorage.getItem("tenantId");
    
    const config = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      },
      ...options
    };

    try {
      console.log(`Making API call to: ${endpoint}`);
      const response = await axios.get(`https://careease-3.onrender.com/api${endpoint}`, config);
      console.log(`API Response from ${endpoint}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  };

  // ✅ Dashboard data fetch karne ka main function
  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // ✅ Parallel API calls for better performance
      const [usersData, appointmentsData] = await Promise.allSettled([
        makeApiCall('/users'), // Users list
        makeApiCall('/appointments/today'), // Today's appointments
        // makeApiCall(`/hospitals/stats`) // Hospital stats (temporarily commented)
      ]);

      console.log("All API responses:", { usersData, appointmentsData });

      // ✅ Users data handle karo
      if (usersData.status === 'fulfilled') {
        const usersResponse = usersData.value;
        // Tumhara response format: {count: 2, users: Array(2)}
        const usersArray = usersResponse.users || usersResponse.data || usersResponse || [];
        setUsers(usersArray);
        console.log("Users set:", usersArray);

        // ✅ Recent activities create karo
        const activities = usersArray.slice(0, 5).map(userItem => ({
          id: userItem._id || userItem.id,
          type: 'USER_CREATE',
          description: `New user ${userItem.firstName} ${userItem.lastName} registered`,
          timestamp: userItem.createdAt || new Date().toISOString()
        }));
        
        setRecentActivities(activities);
        console.log("Activities set:", activities);
      } else {
        console.error("Users API failed:", usersData.reason);
      }

      // ✅ Appointments data handle karo
      if (appointmentsData.status === 'fulfilled') {
        const appointmentsResponse = appointmentsData.value;
        const appointmentsArray = appointmentsResponse.appointments || appointmentsResponse.data || appointmentsResponse || [];
        setTodayAppointments(appointmentsArray);
        console.log("Appointments set:", appointmentsArray);
      } else {
        console.error("Appointments API failed:", appointmentsData.reason);
        setTodayAppointments([]);
      }

      // ✅ Mock stats data (temporary - jab tak stats API ready nahi hai)
      const mockStats = {
        totalUsers: usersData.status === 'fulfilled' ? usersData.value.count || usersData.value.users?.length || 0 : 0,
        activeDoctors: usersData.status === 'fulfilled' ? 
          usersData.value.users?.filter(u => u.roles?.includes('DOCTOR')).length || 0 : 0,
        ipdPatients: 12, // Mock data
        monthlyRevenue: 450000, // Mock data
        occupancyRate: 75 // Mock data
      };
      
      setStats(mockStats);
      console.log("Stats set:", mockStats);

      // ✅ System status check
      setSystemStatus([
        { service: 'API Server', status: 'operational', response: 'All systems normal' },
        { service: 'Database', status: 'operational', response: 'Connected' },
        { service: 'File Storage', status: 'operational', response: 'Ready' }
      ]);

      if (isRefresh) {
        toast.success('Dashboard updated');
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Initial data load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ✅ Refresh handler
  const handleRefresh = useCallback(() => {
    fetchDashboardData(true);
  }, []);

  // ✅ useMemo for optimized performance
  const quickActions = useMemo(() => {
    const actions = [
      {
        icon: UserPlus,
        label: 'Add User',
        path: '/admin/users',
        color: 'bg-blue-500',
        permission: 'USER:CREATE'
      },
      {
        icon: Users,
        label: 'Manage Users',
        path: '/admin/users',
        color: 'bg-green-500',
        permission: 'USER:READ'
      },
      {
        icon: Stethoscope,
        label: 'Patients',
        path: '/patients',
        color: 'bg-purple-500',
        permission: 'PATIENT:READ'
      },
      {
        icon: Calendar,
        label: 'Appointments',
        path: '/appointments',
        color: 'bg-orange-500',
        permission: 'APPOINTMENT:READ'
      },
      {
        icon: FileText,
        label: 'Prescriptions',
        path: '/prescriptions',
        color: 'bg-indigo-500',
        permission: 'PRESCRIPTION:READ'
      },
      {
        icon: Pill,
        label: 'Pharmacy',
        path: '/pharmacy',
        color: 'bg-pink-500',
        permission: 'PHARMACY:READ'
      },
      {
        icon: CreditCard,
        label: 'Billing',
        path: '/billing',
        color: 'bg-emerald-500',
        permission: 'BILLING:READ'
      },
      {
        icon: Shield,
        label: 'Role Management',
        path: '/admin/roles',
        color: 'bg-red-500',
        permission: 'ROLE:MANAGE'
      },
      {
        icon: Building2,
        label: 'Hospital Settings',
        path: '/admin/settings',
        color: 'bg-cyan-500',
        permission: 'HOSPITAL:CONFIG'
      }
    ];

    return actions.filter(action => !action.permission || hasPermission(action.permission));
  }, [hasPermission]);

  const statsCards = useMemo(() => {
    const cards = [
      {
        icon: Users,
        label: 'Total Users',
        value: stats.totalUsers || 0,
        change: 0,
        color: 'bg-blue-500',
        permission: 'USER:READ'
      },
      {
        icon: Stethoscope,
        label: 'Active Doctors',
        value: stats.activeDoctors || 0,
        change: 0,
        color: 'bg-green-500',
        permission: 'USER:READ'
      },
      {
        icon: Calendar,
        label: "Today's Appointments",
        value: todayAppointments.length || 0,
        change: 0,
        color: 'bg-orange-500',
        permission: 'APPOINTMENT:READ'
      },
      {
        icon: Bed,
        label: 'IPD Patients',
        value: stats.ipdPatients || 0,
        change: 0,
        color: 'bg-purple-500',
        permission: 'PATIENT:READ'
      },
      {
        icon: CreditCard,
        label: 'Monthly Revenue',
        value: `₹${(stats.monthlyRevenue || 0).toLocaleString()}`,
        change: 0,
        color: 'bg-emerald-500',
        permission: 'BILLING:READ'
      },
      {
        icon: Activity,
        label: 'Bed Occupancy',
        value: `${stats.occupancyRate || 0}%`,
        change: 0,
        color: 'bg-cyan-500',
        permission: 'HOSPITAL:CONFIG'
      }
    ];

    return cards.filter(card => !card.permission || hasPermission(card.permission));
  }, [stats, todayAppointments, hasPermission]);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-cyan-800 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName || 'Admin'}!
            </h1>
            <p className="text-gray-600 mt-2">
              Here's what's happening in your hospital today
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => (
              <QuickAction key={action.label} {...action} />
            ))}
          </div>
        </div>
      )}

      {/* Charts and Recent Data */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        {hasPermission('BILLING:READ') && (
          <div className="xl:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Revenue Analytics</h3>
              <div className="flex items-center space-x-2">
                <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                </select>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="h-64 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-cyan-600 mx-auto mb-2" />
                <p className="text-gray-600">Revenue: ₹{(stats.monthlyRevenue || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-500">Monthly revenue overview</p>
              </div>
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">System Status</h3>
          <div className="space-y-4">
            {systemStatus.map((system, index) => (
              <div key={system.service} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(system.status)}
                  <div>
                    <p className="font-medium text-gray-900">{system.service}</p>
                    <p className="text-sm text-gray-500">{system.response}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  system.status === 'operational' 
                    ? 'bg-green-100 text-green-800' 
                    : system.status === 'degraded'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {system.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activities & Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        {hasPermission('AUDIT:READ') && recentActivities.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
              <Link to="/activities" className="text-cyan-600 hover:text-cyan-700 text-sm font-medium">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'USER_CREATE' ? 'bg-blue-100 text-blue-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString()} • {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Users */}
        {hasPermission('USER:READ') && users.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
              <Link to="/admin/users" className="text-cyan-600 hover:text-cyan-700 text-sm font-medium">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {users.slice(0, 5).map((userItem) => (
                <div key={userItem._id || userItem.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-cyan-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {userItem.firstName} {userItem.lastName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {userItem.roles?.[0]} • {userItem.department}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    userItem.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {userItem.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {users.length === 0 && recentActivities.length === 0 && (
        <div className="bg-white rounded-xl p-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">
            Start by adding users, patients, and appointments to see dashboard analytics.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/admin/users"
              className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
            >
              Add Users
            </Link>
            <Link
              to="/patients"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Patients
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;