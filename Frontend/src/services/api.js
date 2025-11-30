
// Create axios instance
// src/services/api.js
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';


// Create axios instance with proper configuration
const api = axios.create({
  baseURL: 'https://careease-1.onrender.com/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor - Add auth token and tenant info
api.interceptors.request.use(
  (config) => {
    const authData = JSON.parse(localStorage.getItem('auth') || '{}');
    
    // Add auth token
    if (authData.token) {
      config.headers.Authorization = `Bearer ${authData.token}`;
    }
    
    // Add tenant ID for multi-tenant isolation
    if (authData.user?.tenantId) {
      config.headers['X-Tenant-ID'] = authData.user.tenantId;
    }
    
    // Add user role for ABAC
    if (authData.user?.roles?.[0]) {
      config.headers['X-User-Role'] = authData.user.roles[0];
    }
    
    console.log(`🔄 API Call: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.url}`, error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 403) {
      // Access denied - RBAC/ABAC violation
      console.error('Access Denied: You dont have permission for this action');
    }
    
    // Return unified error format
    return Promise.reject({
      message: error.response?.data?.message || error.message || 'Network error',
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

export default api;