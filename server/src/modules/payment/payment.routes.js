import { Router } from 'express';
import { AppError } from '../../middleware/errorHandler.js';

export const paymentRouter = Router();

paymentRouter.get('/config', (_req, res, next) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId || keyId.includes('REPLACE')) {
      throw new AppError(
        'Razorpay key not configured. Add RAZORPAY_KEY_ID to server/.env',
        503
      );
    }
    res.json({
      provider: 'razorpay',
      keyId,
      currency: 'INR',
    });
  } catch (err) {
    next(err);
  }
});
