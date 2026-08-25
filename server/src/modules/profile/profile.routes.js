import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { createUploader, publicUploadPath, handleMulterError } from '../../lib/upload.js';

export const profileRouter = Router();

profileRouter.use(authenticate);

const uploadAvatar = createUploader('avatars');

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

function mapAddress(address) {
  return {
    id: address.id,
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: address.isDefault,
  };
}

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(8).optional().nullable(),
  email: z.string().email().optional(),
  avatarUrl: z
    .union([z.string().url(), z.literal(''), z.null()])
    .optional()
    .nullable(),
});

const addressSchema = z.object({
  label: z.string().max(50).optional().nullable(),
  fullName: z.string().min(2),
  phone: z.string().min(8),
  line1: z.string().min(3),
  line2: z.string().optional().nullable(),
  city: z.string().min(2),
  state: z.string().optional().nullable(),
  postalCode: z.string().min(4),
  country: z.string().min(2).default('IN'),
  isDefault: z.boolean().optional().default(false),
});

async function getOwnAddressOrThrow(userId, addressId) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) throw new AppError('Address not found', 404);
  return address;
}

async function setDefaultAddress(userId, addressId) {
  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    }),
  ]);
}

/** GET /api/profile */
profileRouter.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError('User not found', 404);

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });

    res.json({
      user: publicUser(user),
      addresses: addresses.map(mapAddress),
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/profile/avatar — multipart field name: avatar */
profileRouter.post(
  '/avatar',
  uploadAvatar.single('avatar'),
  handleMulterError,
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError('Avatar image is required', 400);

      const avatarUrl = publicUploadPath('avatars', req.file.filename);
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { avatarUrl },
      });

      res.json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

/** PATCH /api/profile */
profileRouter.patch('/', async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!existing) throw new AppError('User not found', 404);

    const update = {};
    if (data.fullName !== undefined) update.fullName = data.fullName.trim();
    if (data.phone !== undefined) update.phone = data.phone || null;
    if (data.avatarUrl !== undefined) update.avatarUrl = data.avatarUrl || null;

    if (data.email !== undefined) {
      const email = data.email.toLowerCase().trim();
      if (email !== existing.email) {
        const taken = await prisma.user.findUnique({ where: { email } });
        if (taken) throw new AppError('Email already in use', 409);
        update.email = email;
      }
    }

    if (Object.keys(update).length === 0) {
      return res.json({ user: publicUser(existing) });
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: update,
    });

    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

/** POST /api/profile/addresses */
profileRouter.post('/addresses', async (req, res, next) => {
  try {
    const data = addressSchema.parse(req.body);
    const userId = req.user.id;

    const count = await prisma.address.count({ where: { userId } });
    const makeDefault = data.isDefault || count === 0;

    const address = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          label: data.label || null,
          fullName: data.fullName.trim(),
          phone: data.phone.trim(),
          line1: data.line1.trim(),
          line2: data.line2 || null,
          city: data.city.trim(),
          state: data.state || null,
          postalCode: data.postalCode.trim(),
          country: data.country || 'IN',
          isDefault: makeDefault,
        },
      });
    });

    res.status(201).json({ address: mapAddress(address) });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

/** PATCH /api/profile/addresses/:id */
profileRouter.patch('/addresses/:id', async (req, res, next) => {
  try {
    const data = addressSchema.parse(req.body);
    const existing = await getOwnAddressOrThrow(req.user.id, req.params.id);

    const address = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId: req.user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: existing.id },
        data: {
          label: data.label || null,
          fullName: data.fullName.trim(),
          phone: data.phone.trim(),
          line1: data.line1.trim(),
          line2: data.line2 || null,
          city: data.city.trim(),
          state: data.state || null,
          postalCode: data.postalCode.trim(),
          country: data.country || 'IN',
          isDefault: data.isDefault ? true : existing.isDefault,
        },
      });
    });

    res.json({ address: mapAddress(address) });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

/** DELETE /api/profile/addresses/:id */
profileRouter.delete('/addresses/:id', async (req, res, next) => {
  try {
    const existing = await getOwnAddressOrThrow(req.user.id, req.params.id);
    await prisma.address.delete({ where: { id: existing.id } });

    if (existing.isDefault) {
      const nextDefault = await prisma.address.findFirst({
        where: { userId: req.user.id },
        orderBy: { id: 'asc' },
      });
      if (nextDefault) {
        await prisma.address.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    res.json({ ok: true, id: existing.id });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/profile/addresses/:id/default */
profileRouter.patch('/addresses/:id/default', async (req, res, next) => {
  try {
    const existing = await getOwnAddressOrThrow(req.user.id, req.params.id);
    await setDefaultAddress(req.user.id, existing.id);
    const address = await prisma.address.findUnique({ where: { id: existing.id } });
    res.json({ address: mapAddress(address) });
  } catch (err) {
    next(err);
  }
});
