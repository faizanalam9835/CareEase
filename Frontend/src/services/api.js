import axios from 'axios';

/**
 * Where the auth session lives in localStorage.
 *
 * This was the single most damaging bug in the app: `auth.js` wrote the session
 * under `authToken` / `userData` / `tenantId`, while this interceptor read a
 * key called `auth` that nothing ever wrote. The result was that no request
 * ever carried an Authorization header, so every screen behind the login was
 * empty or erroring. One module now owns these keys.
 */
export const STORAGE_KEYS = {
  token: 'careease.token',
  refreshToken: 'careease.refreshToken',
  user: 'careease.user',
  tenantId: 'careease.tenantId'
};

const readJSON = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

export const session = {
  getToken: () => localStorage.getItem(STORAGE_KEYS.token),
  getRefreshToken: () => localStorage.getItem(STORAGE_KEYS.refreshToken),
  getUser: () => readJSON(STORAGE_KEYS.user),
  getTenantId: () => localStorage.getItem(STORAGE_KEYS.tenantId),

  save: ({ token, refreshToken, user }) => {
    if (token) localStorage.setItem(STORAGE_KEYS.token, token);
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    if (user) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      if (user.tenantId) localStorage.setItem(STORAGE_KEYS.tenantId, user.tenantId);
    }
  },

  updateUser: (user) => {
    if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  },

  clear: () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    // Tidy up keys written by the previous version of the app.
    ['auth', 'authToken', 'userData', 'tenantId', 'hospitalName'].forEach((key) =>
      localStorage.removeItem(key)
    );
  }
};

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = session.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const tenantId = session.getTenantId();
  if (tenantId) config.headers['X-Tenant-ID'] = tenantId;

  return config;
});

/** Set by AuthProvider so a 401 can clear the in-memory session too. */
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data;

    // An expired session logs the user out instead of leaving them staring at
    // a screen that silently fails to load.
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      session.clear();
      onUnauthorized?.();
    }

    // Every rejection is normalised, so callers can rely on `error.message`
    // being something worth showing a person.
    const message =
      payload?.error ||
      payload?.message ||
      (error.code === 'ECONNABORTED'
        ? 'The server took too long to respond. Please try again.'
        : null) ||
      (!error.response
        ? 'Cannot reach the server. Check that the API is running and VITE_API_URL is correct.'
        : 'Something went wrong. Please try again.');

    return Promise.reject(
      Object.assign(new Error(message), {
        status,
        details: payload?.details,
        payload
      })
    );
  }
);

export default api;
