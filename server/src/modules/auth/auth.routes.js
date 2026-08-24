import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { verifyGoogleIdToken } from '../../lib/googleAuth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleSchema = z.object({
  credential: z.string().min(1, 'Missing Google credential'),
});

function signToken(user) {
  return jwt.sign(
    { role: user.role },
    process.env.JWT_SECRET,
    { subject: user.id, expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
    hasPassword: Boolean(user.passwordHash),
  };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new AppError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
      },
    });

    await prisma.cart.create({ data: { userId: user.id } });

    const token = signToken(user);
    res.status(201).json({ user: publicUser(user), token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user) throw new AppError('Invalid email or password', 401);

    if (!user.passwordHash) {
      throw new AppError('This account uses Google sign-in. Continue with Google instead.', 400);
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) throw new AppError('Invalid email or password', 401);
    if (!user.isActive) throw new AppError('Account is disabled', 403);

    const token = signToken(user);
    res.json({ user: publicUser(user), token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

/** Sign in / sign up with a Google Identity Services ID token credential */
authRouter.post('/google', async (req, res, next) => {
  try {
    const { credential } = googleSchema.parse(req.body);
    const profile = await verifyGoogleIdToken(credential);
    const email = profile.email.toLowerCase();

    let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        // Existing email/password account — link Google as an additional sign-in method.
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            avatarUrl: user.avatarUrl || profile.avatarUrl,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            googleId: profile.googleId,
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl,
          },
        });
        await prisma.cart.create({ data: { userId: user.id } });
      }
    }

    if (!user.isActive) throw new AppError('Account is disabled', 403);

    const token = signToken(user);
    res.json({ user: publicUser(user), token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError('User not found', 404);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
