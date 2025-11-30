// src/services/hospitalService.js
import api from './api';

export const hospitalService = {
  // Hospital registration - Backend compatible
  async registerHospital(hospitalData) {
    try {
      const response = await api.post('/hospitals/register', hospitalData);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Hospital registered successfully'
      };
    } catch (error) {
      console.error('Registration API Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed. Please try again.',
        details: error.response?.data
      };
    }
  },

  // Verify hospital email
  async verifyEmail(token) {
    try {
      const response = await api.get(`/hospitals/verify/${token}`);
      return {
        success: true,
        data: response.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Verification failed'
      };
    }
  },

  // Check license availability
  async checkLicense(licenseNumber) {
    try {
      // Yeh tumhara custom check ho sakta hai
      const response = await api.get(`/hospitals/check-license/${licenseNumber}`);
      return {
        success: true,
        available: response.data.available
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'License check failed'
      };
    }
  }
};