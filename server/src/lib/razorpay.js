import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';

export function requireRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId.includes('REPLACE') || keySecret.includes('REPLACE')) {
    throw new AppError(
      'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test keys) to server/.env',
      503
    );
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expected === signature;
}
