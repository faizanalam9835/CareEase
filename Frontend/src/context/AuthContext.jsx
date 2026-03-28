import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/auth'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [tenantId, setTenantId] = useState(null)

    useEffect(() => {
        const storedUser = authAPI.getStoredUser()
        const storedTenantId = authAPI.getStoredTenantId()

        if (storedUser) {
            setUser(storedUser)
            setTenantId(storedUser.tenantId || storedTenantId)
        }

        setLoading(false)
    }, [])

    const login = async (credentials) => {
        try {
            const response = await authAPI.login(credentials)

            if (response?.token && response?.user) {
                authAPI.storeAuthData(response)

                setUser(response.user)
                setTenantId(response.user.tenantId)

                return {
                    success: true,
                    user: response.user
                }
            }

            return { success: false, error: response?.error || "Login failed" }

        } catch (error) {
            return {
                success: false,
                error: error.message
            }
        }
    }

    const logout = () => {
        authAPI.logout()
        setUser(null)
        setTenantId(null)
    }

    const hasRole = (role) => {
    return user?.roles?.includes(role);
     };


    return (
        <AuthContext.Provider value={{ user, loading, login, logout, tenantId , hasRole}}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)