// ─── Common validation helpers (used by both backend and frontend) ─────────────

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPhone = (phone) =>
  /^\+?[1-9]\d{7,14}$/.test(phone.replace(/\s/g, ''));

export const isStrongPassword = (pwd) =>
  pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);

export const isValidPostcode = (postcode) =>
  /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(postcode);

export const isStudentEmail = (email) =>
  /\.(ac\.uk|edu)$/.test(email);

export const isValidOtp = (otp) =>
  /^\d{6}$/.test(otp);

export const sanitizePhone = (phone) =>
  phone.replace(/[\s\-().]/g, '');

// ─── Error codes ───────────────────────────────────────────────────────────────
export const ERROR_CODES = {
  INVALID_CREDENTIALS:    'INVALID_CREDENTIALS',
  USER_NOT_FOUND:         'USER_NOT_FOUND',
  EMAIL_TAKEN:            'EMAIL_TAKEN',
  PHONE_TAKEN:            'PHONE_TAKEN',
  OTP_EXPIRED:            'OTP_EXPIRED',
  OTP_INVALID:            'OTP_INVALID',
  TOKEN_EXPIRED:          'TOKEN_EXPIRED',
  TOKEN_INVALID:          'TOKEN_INVALID',
  UNAUTHORIZED:           'UNAUTHORIZED',
  FORBIDDEN:              'FORBIDDEN',
  NOT_FOUND:              'NOT_FOUND',
  VALIDATION_ERROR:       'VALIDATION_ERROR',
  INTERNAL_ERROR:         'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED:    'RATE_LIMIT_EXCEEDED',
  ACCOUNT_SUSPENDED:      'ACCOUNT_SUSPENDED',
  CART_RESTAURANT_MISMATCH:'CART_RESTAURANT_MISMATCH',
};
