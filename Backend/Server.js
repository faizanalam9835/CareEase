const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/db');

// Import middleware
const { tenantMiddleware } = require('./middleware/tennant');
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const patientRoutes = require('./routes/patientRoutes')
const prescriptionRoutes = require('./routes/prescriptionRoutes')

// Import routes
const hospitalRoutes = require('./routes/hospitalRoutes')


const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database Connection
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Multi-Tenancy Middleware
app.use(tenantMiddleware);

// Routes
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/patients', patientRoutes);
app.use('/api/prescriptions', prescriptionRoutes)
// Basic route to test server
app.get('/', (req, res) => {
  res.send(`🚀 HMS Server is running! Tenant ID: ${req.tenantId || 'Not Set'}`);
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'HMS Server is healthy',
    timestamp: new Date().toISOString(),
    tenantId: req.tenantId || 'Not Set'
  });
});

// 404 Handler for undefined routes - FIXED SYNTAX
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Global Error Handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎯 Server is running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🏥 Hospital Register: http://localhost:${PORT}/api/hospitals/register`);
  console.log(`📧 Make sure RESEND_API_KEY is set in .env file`);
});