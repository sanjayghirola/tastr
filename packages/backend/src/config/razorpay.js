import Razorpay from 'razorpay';
import { logger } from '../utils/logger.js';

let razorpayInstance = null;

export function initRazorpay() {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keyId || !keySecret) {
    logger.warn('Razorpay keys not configured — Razorpay payments disabled');
    return;
  }
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  logger.info('Razorpay initialised');
}

export function getRazorpay() {
  if (!razorpayInstance) throw new Error('Razorpay not initialised — check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars');
  return razorpayInstance;
}

export function isRazorpayEnabled() {
  return !!razorpayInstance;
}
