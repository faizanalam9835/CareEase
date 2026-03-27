import api from './api'

export const authAPI = {
login: async (credentials) => {
    console.log('📡 [API] Sending request:', credentials)

    try {
        const res = await api.post('/auth/login', credentials)

        console.log('📥 [API] Full Axios response:', res)
        console.log('📥 [API] res.data:', res.data)

        return res.data   // ⚠️ IMPORTANT

    } catch (error) {
        console.error('❌ [API] Error response:', error.response)
        return {
            error: error.response?.data?.error || error.message
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