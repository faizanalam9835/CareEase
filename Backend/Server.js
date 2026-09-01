const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const connectDB = require('./config/db');
const { tenantContext } = require('./middleware/tenant');
const { authenticateToken } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { globalSearch, getMetadata } = require('./controllers/dashboardController');

const authRoutes = require('./routes/authRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const billingRoutes = require('./routes/billingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const wardRoutes = require('./routes/wardRoutes');
const bedRoutes = require('./routes/bedRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const vitalsRoutes = require('./routes/vitalsRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

/* ------------------------------ middleware ------------------------------ */

const allowAllOrigins = config.corsOrigins.includes('*');
app.use(
  cors({
    origin: allowAllOrigins ? true : config.corsOrigins,
    credentials: true,
    // Without X-Tenant-ID in the allow-list the browser blocks every
    // authenticated request in production with an opaque CORS error.
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-User-Role'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Compact request log, one line per request, with the status and duration.
app.use((req, res, next) => {
  if (config.nodeEnv === 'test') return next();

  const started = Date.now();
  res.on('finish', () => {
    if (req.originalUrl === '/health') return;
    const tenant = req.user?.tenantId || req.tenantHint || '-';
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms [${tenant}]`
    );
  });
  next();
});

app.use(tenantContext);

/* -------------------------------- routes -------------------------------- */

app.get('/', (_req, res) => {
  res.json({
    name: 'CareEase HMS API',
    status: 'running',
    version: '2.0.0',
    docs: '/api/health'
  });
});

const health = (_req, res) =>
  res.json({
    success: true,
    status: 'OK',
    uptime: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    demoMode: config.demoMode,
    timestamp: new Date().toISOString()
  });

app.get('/health', health);
app.get('/api/health', health);

app.get('/api/meta', getMetadata);
app.get('/api/search', authenticateToken, globalSearch);

app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

/* -------------------------------- startup ------------------------------- */

const start = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('[startup] could not reach MongoDB:', error.message);
    console.error('[startup] check MONGO_URI in Backend/.env');
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log('');
    console.log('  CareEase HMS API');
    console.log(`  listening   http://localhost:${config.port}`);
    console.log(`  health      http://localhost:${config.port}/api/health`);
    console.log(`  environment ${config.nodeEnv}`);
    console.log(`  mail        ${config.email.enabled ? 'SMTP' : 'console (no SMTP configured)'}`);
    if (config.demoMode) {
      console.log('  demo mode   on - GET /api/auth/demo-credentials lists the sample logins');
    }
    console.log('');
  });

  const shutdown = (signal) => {
    console.log(`\n[shutdown] ${signal} received, closing server`);
    server.close(() => {
      require('mongoose').connection.close(false).finally(() => process.exit(0));
    });
    // Do not hang forever if a connection refuses to drain.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

// An unhandled rejection used to take the process down silently in production.
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandled promise rejection:', reason);
});

if (require.main === module) {
  start();
}

module.exports = app;
module.exports.start = start;
