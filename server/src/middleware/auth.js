import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { prisma } from '../lib/prisma.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'ADMIN') {
    return next(new AppError('Admin access required', 403));
  }
  next();
}

export async function loadUser(req, _res, next) {
  if (!req.user?.id) return next();
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return next(new AppError('User not found or inactive', 401));
  }
  req.currentUser = user;
  next();
}
