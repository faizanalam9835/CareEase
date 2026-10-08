import mongoose from 'mongoose';
import config from './env';

mongoose.set('strictQuery', true);

let connectionPromise: Promise<typeof mongoose> | null = null;

const connectDB = async (uri: string = config.mongoUri): Promise<typeof mongoose> => {
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

const disconnectDB = async (): Promise<void> => {
  connectionPromise = null;
  await mongoose.connection.close();
};

export default connectDB;
export { connectDB, disconnectDB };
