import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/errorHandler.js';
import { optionalAuth } from '../../middleware/auth.js';
import { assistantReply } from './assistant.js';

export const aiRouter = Router();

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(500, 'Message is too long'),
});

aiRouter.post('/chat', optionalAuth, async (req, res, next) => {
  try {
    const { message } = chatSchema.parse(req.body);
    const result = await assistantReply(message, { userId: req.user?.id });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});
