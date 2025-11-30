// src/services/dashboardService.js
import axios from 'axios';
import api from './api';

export const getData = () => {
   axios.get(`https://careease-1.onrender.com/api/users/692bef7248385fce15ec9281`)
  .then((res) => console.log(res))
  .catch(console.log(error))
}

export const dashboardService = {
  // Admin Dashboard Stats
  getAdminStats: async () => {
    try {
      const response = await api.get('/dashboard/admin/stats');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return {
        success: false,
        error: error.message,
        data: {
          totalUsers: 0,
          activeDoctors: 0,
          userGrowth: 0,
          doctorGrowth: 0,
          ipdPatients: 0,
          monthlyRevenue: 0,
          occupancyRate: 0
        }
      };
    }
  },

  // Recent Activities
  getRecentActivities: async () => {
    try {
      const response = await api.get('/dashboard/activities');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Recent activities error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },

  // System Status
  getSystemStatus: async () => {
    try {
      const response = await api.get('/dashboard/system-status');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('System status error:', error);
      // Return default system status
      return {
        success: false,
        error: error.message,
        data: [
          { service: 'Database', status: 'operational', response: '45ms' },
          { service: 'API Server', status: 'operational', response: '120ms' },
          { service: 'Email Service', status: 'degraded', response: '2.1s' },
          { service: 'File Storage', status: 'operational', response: '80ms' }
        ]
      };
    }
  }
};