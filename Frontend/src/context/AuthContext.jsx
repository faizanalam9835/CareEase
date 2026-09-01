import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services';
import { session, setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

/**
 * The single source of truth for who is signed in.
 *
 * The app previously had two: this context and a `useAuth` hook that kept its
 * own `useState`. Components picked one at random, so the sidebar could show a
 * user while the route guard thought nobody was signed in. That hook is gone.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => session.getUser());
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  // Revalidate the stored session against the server on boot, so a user whose
  // account was deactivated or whose token expired is not left with a UI that
  // looks signed in but cannot load anything.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (!session.getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user: fresh } = await authService.me();
        if (cancelled) return;
        session.updateUser(fresh);
        setUser(fresh);
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(async (credentials) => {
    try {
      const response = await authService.login({
        ...credentials,
        tenantId: credentials.tenantId?.trim().toUpperCase()
      });
      session.save(response);
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { user: fresh } = await authService.me();
    session.updateUser(fresh);
    setUser(fresh);
    return fresh;
  }, []);

  const value = useMemo(() => {
    const roles = user?.roles || [];

    /** Accepts a role or a list; returns true if the user holds any of them. */
    const hasRole = (role) => {
      if (!role || (Array.isArray(role) && role.length === 0)) return true;
      const wanted = Array.isArray(role) ? role : [role];
      return wanted.some((entry) => roles.includes(entry));
    };

    return {
      user,
      loading,
      isAuthenticated: Boolean(user),
      roles,
      primaryRole: roles[0] || null,
      tenantId: user?.tenantId || null,
      department: user?.department || null,
      login,
      logout,
      refreshUser,
      setUser,
      hasRole,
      isAdmin: roles.includes('HOSPITAL_ADMIN'),
      isDoctor: roles.includes('DOCTOR'),
      isPharmacist: roles.includes('PHARMACIST'),
      isReceptionist: roles.includes('RECEPTIONIST'),
      isNurse: roles.includes('NURSE'),
      // Clinical staff are limited to their own department; everyone else works
      // hospital-wide. Mirrors the rule the API enforces.
      seesAllDepartments: roles.some((role) =>
        ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'PHARMACIST'].includes(role)
      )
    };
  }, [user, loading, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};
