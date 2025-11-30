// src/services/userService.js
import api from './api';

export const userService = {
  // Get all users with pagination
  getUsers: async (params = {}) => {
    try {
      const response = await api.get('/users', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Get users error:', error);
      return {
        success: false,
        error: error.message,
        data: { users: [], total: 0 }
      };
    }
  },

  // Create user
  createUser: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update user
  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get user by ID
  getUserById: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Get user by ID error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};