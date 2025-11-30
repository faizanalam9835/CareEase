// src/services/appointmentService.js
import api from './api';

export const appointmentService = {
  // Get all appointments
  getAppointments: async (params = {}) => {
    try {
      const response = await api.get('/appointments', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Get appointments error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },

  // Create appointment
  createAppointment: async (appointmentData) => {
    try {
      const response = await api.post('/appointments', appointmentData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Create appointment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get today's appointments
  getTodayAppointments: async () => {
    try {
      const response = await api.get('/appointments/today');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Get today appointments error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },

  // Update appointment status
  updateAppointmentStatus: async (id, status) => {
    try {
      const response = await api.put(`/appointments/${id}/status`, { status });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Update appointment status error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};