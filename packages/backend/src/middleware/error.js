import { logger } from '../utils/logger.js';
import { ERROR_CODES } from '@tastr/shared';

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    code: ERROR_CODES.NOT_FOUND,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

export function errorHandler(err, req, res, _next) {
  logger.error({
    message: err.message,
    stack:   err.stack,
    url:     req.originalUrl,
    method:  req.method,
  });

  // express-validator errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid JSON body',
    });
  }

  const statusMap = {
    [ERROR_CODES.INVALID_CREDENTIALS]:     401,
    [ERROR_CODES.UNAUTHORIZED]:            401,
    [ERROR_CODES.TOKEN_EXPIRED]:           401,
    [ERROR_CODES.TOKEN_INVALID]:           401,
    [ERROR_CODES.FORBIDDEN]:               403,
    [ERROR_CODES.NOT_FOUND]:               404,
    [ERROR_CODES.EMAIL_TAKEN]:             409,
    [ERROR_CODES.PHONE_TAKEN]:             409,
    [ERROR_CODES.OTP_EXPIRED]:             410,
    [ERROR_CODES.OTP_INVALID]:             422,
    [ERROR_CODES.VALIDATION_ERROR]:        422,
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]:     429,
    [ERROR_CODES.ACCOUNT_SUSPENDED]:       403,
  };

  const status = statusMap[err.code] || err.statusCode || 500;

  res.status(status).json({
    success: false,
    code:    err.code || ERROR_CODES.INTERNAL_ERROR,
    message: status < 500 ? err.message : 'Something went wrong. Please try again.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// Validation result helper — call at start of controller
export { validationResult } from 'express-validator';

export function handleValidationErrors(req, res) {
  const { validationResult: vr } = require('express-validator');
  const errors = vr(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      errors: errors.array(),
    });
    return true;
  }
  return false;
}
