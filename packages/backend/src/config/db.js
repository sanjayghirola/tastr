import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export async function connectDB() {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      });
      logger.info('✅  MongoDB connected');
      return;
    } catch (err) {
      attempt++;
      logger.warn(`MongoDB connection attempt ${attempt} failed: ${err.message}`);
      if (attempt >= MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('error', (err) => logger.error('MongoDB error', err));
