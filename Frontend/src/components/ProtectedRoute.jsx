import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

const ProtectedRoute = ({ children, allowedRoles = [], attributes = {} }) => {
  const { user, loading, canAccess } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (allowedRoles.length > 0 && !user.roles.some(role => allowedRoles.includes(role))) {
    return <div>Access Denied - Insufficient permissions</div>
  }

  // ABAC check
  if (attributes.resource && !canAccess(attributes.resource, attributes.action, attributes)) {
    return <div>Access Denied - Department restriction</div>
  }

  return children
}

export default ProtectedRoute