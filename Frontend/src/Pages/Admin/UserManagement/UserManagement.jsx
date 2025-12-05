// src/Pages/admin/UserManagement/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2,
  Shield,
  Phone,
  Building,
  Download,
  RefreshCw,
  Eye,
  Mail,
  CheckCircle,
  XCircle,
  Briefcase
} from 'lucide-react';

// ✅ Simple API function
const API_BASE_URL = 'https://careease-3.onrender.com/api';

// ✅ Simple API call function
const apiCall = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    return { success: true, data };
  } catch (error) {
    console.error('API Error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

const UserManagement = () => {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // User roles and departments
  const userRoles = ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST'];
  const statusOptions = ['ACTIVE', 'INACTIVE', 'LOCKED'];
  const departments = ['Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Emergency', 'Administration', 'General'];

  // ✅ Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/users');
      
      if (result.success) {
        setUsers(result.data.users || []);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ✅ Create user function
  const handleCreateUser = async (userData) => {
    if (!hasRole('HOSPITAL_ADMIN')) {
      toast.error('Access denied');
      return;
    }

    const result = await apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    if (result.success) {
      toast.success('User created successfully! Welcome email sent.');
      setShowCreateModal(false);
      fetchUsers();
    } else {
      toast.error(result.error);
    }
  };

  // ✅ Update user function
  const handleUpdateUser = async (userId, userData) => {
    const result = await apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });

    if (result.success) {
      toast.success('User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } else {
      toast.error(result.error);
    }
  };

  // ✅ Delete user function
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    if (!hasRole('HOSPITAL_ADMIN')) {
      toast.error('Access denied');
      return;
    }

    const result = await apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'INACTIVE' })
    });

    if (result.success) {
      toast.success('User deactivated successfully!');
      fetchUsers();
    } else {
      toast.error(result.error);
    }
  };

  // ✅ Toggle user status
  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const result = await apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    
    if (result.success) {
      toast.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } else {
      toast.error(result.error);
    }
  };

  // ✅ Filter users
  const filteredUsers = users.filter(userItem => {
    const matchesSearch = 
      userItem.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.professionalemail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.phone?.includes(searchTerm);

    const matchesRole = roleFilter === 'ALL' || userItem.roles?.includes(roleFilter);
    const matchesStatus = statusFilter === 'ALL' || userItem.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // ✅ Role badge colors
  const getRoleBadgeColor = (role) => {
    const colors = {
      'HOSPITAL_ADMIN': 'bg-purple-100 text-purple-800',
      'DOCTOR': 'bg-blue-100 text-blue-800',
      'NURSE': 'bg-green-100 text-green-800',
      'RECEPTIONIST': 'bg-orange-100 text-orange-800',
      'PHARMACIST': 'bg-indigo-100 text-indigo-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">
            Manage hospital staff and permissions
            {hasRole('HOSPITAL_ADMIN') && ' - Full Access'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={fetchUsers}
            className="flex items-center justify-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {hasRole('HOSPITAL_ADMIN') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center space-x-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <option value="ALL">All Roles</option>
            {userRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <option value="ALL">All Status</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {filteredUsers.length} of {users.length} users
          </span>
          <button className="flex items-center space-x-2 text-cyan-600 hover:text-cyan-700 text-sm">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Mobile View */}
        <div className="block lg:hidden">
          <div className="divide-y divide-gray-200">
            {filteredUsers.map((userItem) => (
              <div key={userItem._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 bg-cyan-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {userItem.firstName} {userItem.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        <Mail className="h-3 w-3 inline mr-1" />
                        {userItem.professionalemail || userItem.email}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    userItem.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : userItem.status === 'LOCKED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {userItem.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {userItem.phone || 'No phone'}
                  </div>
                  
                  {userItem.professionalemail && userItem.professionalemail !== userItem.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Briefcase className="h-4 w-4 mr-2" />
                      {userItem.professionalemail}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-1">
                    {userItem.roles?.map(role => (
                      <span
                        key={role}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {role}
                      </span>
                    ))}
                  </div>

                  {userItem.department && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-4 w-4 mr-2" />
                      {userItem.department}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedUser(userItem);
                      setShowViewModal(true);
                    }}
                    className="flex items-center space-x-1 text-cyan-600 hover:text-cyan-700 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>

                  {hasRole('HOSPITAL_ADMIN') && (
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleStatusToggle(userItem._id, userItem.status)}
                        className={`text-sm ${
                          userItem.status === 'ACTIVE' 
                            ? 'text-orange-600 hover:text-orange-700' 
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {userItem.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedUser(userItem);
                          setShowEditModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      
                      <button
                        onClick={() => handleDeleteUser(userItem._id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Professional Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role & Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((userItem) => (
                <tr key={userItem._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-cyan-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {userItem.firstName} {userItem.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{userItem.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {userItem.phone || 'Not provided'}
                      </div>
                    </div>
                  </td>

                  {/* Professional Email Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Briefcase className="h-4 w-4 mr-2 text-cyan-500" />
                      {userItem.professionalemail ? (
                        <span className="text-cyan-700 font-medium">
                          {userItem.professionalemail}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {userItem.roles?.map(role => (
                          <span
                            key={role}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {role}
                          </span>
                        ))}
                      </div>
                      {userItem.department && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Building className="h-4 w-4 mr-1" />
                          {userItem.department}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      userItem.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : userItem.status === 'LOCKED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {userItem.status === 'ACTIVE' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                      {userItem.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(userItem);
                          setShowViewModal(true);
                        }}
                        className="text-cyan-600 hover:text-cyan-900 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {hasRole('HOSPITAL_ADMIN') && (
                        <>
                          <button
                            onClick={() => handleStatusToggle(userItem._id, userItem.status)}
                            className={`${
                              userItem.status === 'ACTIVE' 
                                ? 'text-orange-600 hover:text-orange-900' 
                                : 'text-green-600 hover:text-green-900'
                            } transition-colors`}
                            title={userItem.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            {userItem.status === 'ACTIVE' ? '⏸️' : '▶️'}
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedUser(userItem);
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteUser(userItem._id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating your first user'
              }
            </p>
            {hasRole('HOSPITAL_ADMIN') && !searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
              >
                Add First User
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && hasRole('HOSPITAL_ADMIN') && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
          roles={userRoles}
          departments={departments}
        />
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <ViewUserModal
          user={selectedUser}
          onClose={() => {
            setShowViewModal(false);
            setSelectedUser(null);
          }}
          onEdit={() => {
            setShowViewModal(false);
            setShowEditModal(true);
          }}
          canEdit={hasRole('HOSPITAL_ADMIN')}
          getRoleBadgeColor={getRoleBadgeColor}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && hasRole('HOSPITAL_ADMIN') && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSubmit={handleUpdateUser}
          roles={userRoles}
          departments={departments}
          statusOptions={statusOptions}
        />
      )}
    </div>
  );
};

// ✅ Create User Modal Component
const CreateUserModal = ({ onClose, onSubmit, roles, departments }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    professionalemail: '',
    phone: '',
    department: '',
    roles: []
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.department || formData.roles.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role) 
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Enter first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Enter last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
              Professional Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="user@hospital.com"
              />
               <p className="text-xs text-gray-500 mt-1">
                this email will be use for your workSpace
              </p>
            </div>

            {/* Professional Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
               Personal Email *
              </label>
              <input
                type="email"
                value={formData.professionalemail}
                onChange={(e) => setFormData({...formData, professionalemail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="name@gmail.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Welcome email with credentials will be sent to this address
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="+91 9876543210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department *
              </label>
              <select
                required
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Roles *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map(role => (
                <label key={role} className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role)}
                    onChange={() => handleRoleChange(role)}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">{role}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-cyan-800">
              <Briefcase className="h-4 w-4" />
              <span className="font-medium">Professional Email Notice</span>
            </div>
            <p className="text-sm text-cyan-700 mt-1">
              If professional email is provided, welcome email with login credentials will be sent there. Otherwise, it will be sent to personal email.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              disabled={loading}
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{loading ? 'Creating...' : 'Create User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ✅ View User Modal Component
const ViewUserModal = ({ user, onClose, onEdit, canEdit, getRoleBadgeColor }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 h-16 w-16 bg-cyan-100 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Personal Email:</span>
              <p className="text-gray-900">{user.email}</p>
            </div>
            
            {/* Professional Email Display */}
            {user.professionalemail && (
              <div>
                <span className="font-medium text-gray-700 flex items-center">
                  <Briefcase className="h-4 w-4 mr-1 text-cyan-600" />
                  Professional Email:
                </span>
                <p className="text-gray-900 font-medium text-cyan-700">{user.professionalemail}</p>
              </div>
            )}
            
            <div>
              <span className="font-medium text-gray-700">Phone:</span>
              <p className="text-gray-900">{user.phone || 'Not provided'}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Department:</span>
              <p className="text-gray-900">{user.department || 'Not assigned'}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                user.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800' 
                  : user.status === 'LOCKED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user.status === 'ACTIVE' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                {user.status}
              </span>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Tenant ID:</span>
              <p className="text-gray-900 font-mono text-xs">{user.tenantId}</p>
            </div>
          </div>

          <div>
            <span className="font-medium text-gray-700">Roles:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {user.roles?.map(role => (
                <span
                  key={role}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(role)}`}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            {canEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                Edit User
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ Edit User Modal Component
const EditUserModal = ({ user, onClose, onSubmit, roles, departments, statusOptions }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    professionalemail: user.professionalemail || '',
    phone: user.phone,
    department: user.department,
    roles: user.roles || [],
    status: user.status
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(user._id, formData);
    setLoading(false);
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role) 
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Professional Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Professional Email
              </label>
              <input
                type="email"
                value={formData.professionalemail}
                onChange={(e) => setFormData({...formData, professionalemail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="dr.name@hospital.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department *
              </label>
              <select
                required
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Roles *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map(role => (
                <label key={role} className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role)}
                    onChange={() => handleRoleChange(role)}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <span className="text-sm text-gray-700">{role}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              disabled={loading}
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{loading ? 'Updating...' : 'Update User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;