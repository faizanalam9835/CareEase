// src/services/pharmacyService.js
import api from './api';

export const pharmacyService = {
  // Get all medicines
  getMedicines: async (params = {}) => {
    try {
      const response = await api.get('/pharmacy/medicines', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add medicine
  addMedicine: async (medicineData) => {
    try {
      const response = await api.post('/pharmacy/medicines', medicineData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get low stock medicines
  getLowStockMedicines: async () => {
    try {
      const response = await api.get('/pharmacy/medicines/low-stock');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update medicine stock
  updateMedicineStock: async (id, stockData) => {
    try {
      const response = await api.put(`/pharmacy/medicines/${id}/stock`, stockData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};