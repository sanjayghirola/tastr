import { validationResult } from 'express-validator';
import { ERROR_CODES } from '@tastr/shared';

/**
 * validate — placed after express-validator .body()/.query() chains
 * Responds 422 if any validation error exists, otherwise calls next()
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      code:    ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}
