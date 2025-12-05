import { useState, useEffect } from 'react'
import { authAPI } from '../services/auth'


export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState(null)
  
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = authAPI.getStoredUser()
      const storedTenantId = authAPI.getStoredTenantId()
      
      if (storedUser) {
        setUser(storedUser)
        // ✅ Tenant ID set karo
        if (storedUser.tenantId) {
          setTenantId(storedUser.tenantId)
        } else if (storedTenantId) {
          setTenantId(storedTenantId)
        }
      }
      setLoading(false)
    }
    
    initAuth()
  }, [])

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials)
      
      if (response.success && response.user) {
        setUser(response.user)
        
        // ✅ Tenant context update karo
        if (response.user.tenantId) {
          setTenantId(response.user.tenantId)
        }
        
        return { success: true, user: response.user }
      } else {
        return { 
          success: false, 
          error: response.error || 'Login failed' 
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: 'Login failed. Please try again.' 
      }
    }
  }

  const logout = () => {
    authAPI.logout()
    setUser(null)
    setTenantId(null)
    
  }

  // ✅ RBAC - Role-based access
  const hasRole = (role) => {
    if (!user?.roles) return false
    if (typeof role === 'string') {
      return user.roles.includes(role)
    }
    return role.some(r => user.roles.includes(r))
  }

  // ✅ ABAC - Attribute-based access control
  const canAccess = (resource, action, attributes = {}) => {
    // SUPER_ADMIN ko sab kuch access
    if (hasRole('SUPER_ADMIN')) return true

    // HOSPITAL_ADMIN ko apne tenant tak limited
    if (hasRole('HOSPITAL_ADMIN')) {
      // Cross-tenant access check
      if (attributes.tenantId && attributes.tenantId !== tenantId) {
        return false
      }
      return true
    }

    // DOCTOR - Department-based access
    if (hasRole('DOCTOR') && attributes.department) {
      return user.department === attributes.department
    }

    // NURSE - Department based
    if (hasRole('NURSE') && attributes.department) {
      return user.department === attributes.department
    }

    // RECEPTIONIST - Limited to their hospital
    if (hasRole('RECEPTIONIST')) {
      return attributes.tenantId ? attributes.tenantId === tenantId : true
    }

    // PHARMACIST - Pharmacy department only
    if (hasRole('PHARMACIST') && attributes.department) {
      return user.department === 'Pharmacy'
    }

    // Default permission check
    const requiredPermission = `${resource}:${action}`
    return user?.permissions?.includes(requiredPermission) || false
  }

  // ✅ Tenant-specific utility functions
  const isCurrentTenant = (checkTenantId) => {
    return tenantId === checkTenantId
  }

  const getTenantContext = () => {
    return {
      tenantId,
      hospitalName: user?.hospitalName || localStorage.getItem('hospitalName'),
      userDepartment: user?.department,
      userSpecialization: user?.specialization
    }
  }

  return { 
    // Auth state
    user, 
    loading, 
    
    // Auth actions
    login, 
    logout, 
    
    // Access control
    hasRole, 
    canAccess,
    
    // Tenant context
    tenantId,
    isCurrentTenant,
    getTenantContext
  }
}