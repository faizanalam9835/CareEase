const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Simple connection without deprecated options
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    
    // Connection events handle karte hain
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    // App close hone par connection close
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('📦 MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;