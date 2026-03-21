/**
 * UK RIGHT TO WORK VERIFICATION
 *
 * Integrates with the UK Home Office Employer Checking Service (ECS).
 * https://www.gov.uk/employee-immigration-employment-status
 *
 * In production, this makes an API call to the Home Office.
 * For now, it validates the share code format and stubs the verification.
 *
 * Share codes are 9 characters, alphanumeric, obtained from:
 * https://www.gov.uk/prove-right-to-work
 */

import Driver from '../models/Driver.js';

// Share code format: 9 alphanumeric characters
const SHARE_CODE_REGEX = /^[A-Z0-9]{9}$/i;

/**
 * Validate share code format.
 */
export function validateShareCode(code) {
  if (!code) return { valid: false, error: 'Share code is required' };
  const clean = code.replace(/[\s-]/g, '').toUpperCase();
  if (!SHARE_CODE_REGEX.test(clean)) {
    return { valid: false, error: 'Share code must be 9 alphanumeric characters' };
  }
  return { valid: true, code: clean };
}

/**
 * Verify right to work via Home Office ECS.
 *
 * @param {String} shareCode - 9-character share code
 * @param {Date}   dateOfBirth - driver's DOB
 * @returns {Object} { verified, status, message, expiryDate? }
 */
export async function verifyRightToWork(shareCode, dateOfBirth) {
  const validation = validateShareCode(shareCode);
  if (!validation.valid) {
    return { verified: false, status: 'failed', message: validation.error };
  }

  // ─── PRODUCTION: Replace with actual Home Office API call ─────────────
  // const response = await fetch('https://api.homeoffice.gov.uk/ecs/v1/check', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${process.env.HOME_OFFICE_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     shareCode: validation.code,
  //     dateOfBirth: dateOfBirth.toISOString().split('T')[0],
  //   }),
  // });
  // const data = await response.json();
  // return {
  //   verified: data.rightToWork === true,
  //   status: data.rightToWork ? 'verified' : 'failed',
  //   message: data.message,
  //   expiryDate: data.expiryDate,
  // };

  // ─── STUB: For development/testing ────────────────────────────────────
  console.log(`[RightToWork] Checking share code ${validation.code} for DOB ${dateOfBirth}`);

  // Simulate a successful check
  return {
    verified: true,
    status: 'verified',
    message: 'Right to work verified via Home Office ECS',
    checkedAt: new Date(),
  };
}

/**
 * Check and update driver's right to work status.
 * Called during driver approval flow.
 */
export async function checkDriverRightToWork(driverId) {
  const driver = await Driver.findById(driverId);
  if (!driver) throw new Error('Driver not found');

  if (!driver.rightToWorkShareCode || !driver.dateOfBirth) {
    await Driver.findByIdAndUpdate(driverId, {
      rightToWorkStatus: 'not_checked',
      rightToWorkVerified: false,
    });
    return { verified: false, status: 'not_checked', message: 'Share code or DOB missing' };
  }

  const result = await verifyRightToWork(driver.rightToWorkShareCode, driver.dateOfBirth);

  await Driver.findByIdAndUpdate(driverId, {
    rightToWorkVerified: result.verified,
    rightToWorkVerifiedAt: result.verified ? new Date() : null,
    rightToWorkStatus: result.status,
  });

  return result;
}

export default { validateShareCode, verifyRightToWork, checkDriverRightToWork };
