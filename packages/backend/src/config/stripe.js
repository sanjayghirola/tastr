import Stripe from 'stripe';
import { logger } from '../utils/logger.js';

let stripe;

export function initStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.startsWith('sk_test_xxxx') || key.length < 20) {
    logger.warn('⚠️  Stripe secret key not configured or is placeholder — Stripe payments disabled');
    return;
  }
  stripe = new Stripe(key, {
    apiVersion: '2024-04-10',
    appInfo: { name: 'Tastr', version: '1.0.0' },
  });
  logger.info('✅  Stripe initialised');
}

export function getStripe() {
  if (!stripe) throw new Error('Stripe not initialised — check STRIPE_SECRET_KEY in .env');
  return stripe;
}

export function isStripeEnabled() {
  return !!stripe;
}
