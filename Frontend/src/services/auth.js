import api from './api'

export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials)
      
      if (response.data.success) {
        // ✅ Auth data store karo
        authAPI.storeAuthData(response.data)
      }
      
      return response.data
    } catch (error) {
      console.error('Login API Error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      }
    }
  },
  
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (error) {
      console.error('Get Current User Error:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch user data'
      }
    }
  },
  
  logout: () => {
    // ✅ Saari auth related data clear karo
    localStorage.removeItem('authToken')
    localStorage.removeItem('tenantId')
    localStorage.removeItem('userData')
    localStorage.removeItem('hospitalName')
  },
  
  storeAuthData: (data) => {
    if (data.token) {
      localStorage.setItem('authToken', data.token)
    }
    if (data.user?.tenantId) {
      localStorage.setItem('tenantId', data.user.tenantId)
    }
    if (data.user) {
      localStorage.setItem('userData', JSON.stringify(data.user))
    }
    // ✅ Hospital name bhi store karo if available
    if (data.user?.hospitalName) {
      localStorage.setItem('hospitalName', data.user.hospitalName)
    }
  },
  
  getStoredUser: () => {
    try {
      const userData = localStorage.getItem('userData')
      return userData ? JSON.parse(userData) : null
    } catch (error) {
      console.error('Error parsing stored user:', error)
      return null
    }
  },
  
  getStoredToken: () => {
    return localStorage.getItem('authToken')
  },
  
  getStoredTenantId: () => {
    return localStorage.getItem('tenantId')
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken')
  }
}