// src/hooks/usePermissions.js (SIMPLE VERSION)
import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasRole = (role) => {
    if (!user?.roles) return false;
    
    if (Array.isArray(role)) {
      return role.some(r => user.roles.includes(r));
    }
    
    return user.roles.includes(role);
  };

  const hasPermission = (permission) => {
    // Temporary - allow all permissions
    return true;
  };

  const canAccess = (allowedRoles = [], requiredPermission = null) => {
    return true; // Temporary
  };

  return { hasRole, hasPermission, canAccess };
};