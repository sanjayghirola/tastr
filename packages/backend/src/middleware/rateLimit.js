import rateLimit from 'express-rate-limit';
import { RATE_LIMITS, ERROR_CODES } from '@tastr/shared';

const makeLimit = (max, windowMin, message) => rateLimit({
  windowMs: windowMin * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, code: ERROR_CODES.RATE_LIMIT_EXCEEDED, message },
  skipSuccessfulRequests: false,
});

// Global API limiter — 120 req/min
export const apiLimiter = makeLimit(
  RATE_LIMITS.API_MAX,
  RATE_LIMITS.API_WINDOW_MIN,
  'Too many requests. Please slow down.',
);

// Auth routes — 5 req/min
export const authLimiter = makeLimit(
  RATE_LIMITS.AUTH_MAX,
  RATE_LIMITS.AUTH_WINDOW_MIN,
  'Too many auth attempts. Please wait 1 minute.',
);

// OTP routes — 3 req/15min
export const otpLimiter = makeLimit(
  RATE_LIMITS.OTP_MAX,
  RATE_LIMITS.OTP_WINDOW_MIN,
  'Too many OTP requests. Please wait 15 minutes.',
);

// Admin login — tighter: 5 attempts per 5 min
export const adminAuthLimiter = makeLimit(5, 5, 'Too many admin login attempts.');
