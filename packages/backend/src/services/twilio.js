import twilio from 'twilio';
import { logger } from '../utils/logger.js';

let client;

function getClient() {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

export async function sendOtp(phone, otp) {
  try {
    await getClient().messages.create({
      body: `Your Tastr verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      from: process.env.TWILIO_FROM_NUMBER,
      to:   phone,
    });
    logger.info(`OTP sent to ${phone}`);
  } catch (err) {
    logger.error(`Failed to send OTP to ${phone}: ${err.message}`);
    throw new Error('Failed to send OTP. Please try again.');
  }
}
