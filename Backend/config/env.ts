import path from 'path';
import dotenv from 'dotenv';

// Source runs from config/, the compiled build from dist/config/ - both must find Backend/.env.
const backendRoot = path.join(__dirname, '..', path.basename(path.join(__dirname, '..')) === 'dist' ? '..' : '');
dotenv.config({ path: path.join(backendRoot, '.env') });

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5175',
  corsOrigins: (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/careease',

  jwtSecret: process.env.JWT_SECRET || 'careease-development-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  demoMode: toBool(process.env.DEMO_MODE, true),

  // Sarvam voice receptionist: one secret per hospital, "TDEMO001=key1,THOSP002=key2".
  // The key alone decides the tenant, so a caller can never pick another hospital.
  voiceKeys: (process.env.VOICE_KEYS || '')
    .split(',')
    .map((pair) => pair.split('=').map((part) => part.trim()))
    .filter(([tenant, key]) => tenant && key && key.length >= 24)
    .map(([tenant, key]) => ({ tenantId: tenant.toUpperCase(), key })),

  email: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'CareEase HMS',
    get enabled() {
      return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    }
  }
};

// Fail fast on the one thing that is genuinely unsafe to default in production.
if (config.isProduction && config.jwtSecret === 'careease-development-secret-change-me') {
  throw new Error('JWT_SECRET must be set to a strong secret when NODE_ENV=production');
}

export type Config = typeof config;

export default config;
