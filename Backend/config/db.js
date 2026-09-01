const mongoose = require('mongoose');
const config = require('./env');

mongoose.set('strictQuery', true);

let connectionPromise = null;

const connectDB = async (uri = config.mongoUri) => {
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 20
    })
    .then((conn) => {
      console.log(`[db] connected to ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });

  return connectionPromise;
};

const disconnectDB = async () => {
  connectionPromise = null;
  await mongoose.connection.close();
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
