import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { formatMoney } from '../../lib/utils.js';

export const cartRouter = Router();

cartRouter.use(authenticate);

async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          variant: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });
  }

  return cart;
}

function mapCart(cart) {
  const items = cart.items.map((item) => {
    const { variant } = item;
    const { product } = variant;
    const lineTotal = variant.priceCents * item.quantity;
    return {
      id: item.id,
      quantity: item.quantity,
      variantId: variant.id,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
      },
      attrs: variant.variantAttrs,
      unitPrice: formatMoney(variant.priceCents, product.currency),
      lineTotal: formatMoney(lineTotal, product.currency),
      stockQty: variant.stockQty,
    };
  });

  const subtotalCents = items.reduce((sum, i) => sum + i.lineTotal.cents, 0);

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: formatMoney(subtotalCents),
  };
}

cartRouter.get('/', async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    res.json({ cart: mapCart(cart) });
  } catch (err) {
    next(err);
  }
});

const addSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20).default(1),
});

cartRouter.post('/items', async (req, res, next) => {
  try {
    const data = addSchema.parse(req.body);
    const variant = await prisma.productVariant.findUnique({
      where: { id: data.variantId },
      include: { product: true },
    });
    if (!variant || !variant.product.isPublished) {
      throw new AppError('Product variant not found', 404);
    }
    if (variant.stockQty < data.quantity) {
      throw new AppError('Not enough stock', 400);
    }

    const cart = await getOrCreateCart(req.user.id);
    const existing = cart.items.find((i) => i.variantId === data.variantId);

    if (existing) {
      const newQty = existing.quantity + data.quantity;
      if (variant.stockQty < newQty) throw new AppError('Not enough stock', 400);
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: data.variantId,
          quantity: data.quantity,
        },
      });
    }

    const updated = await getOrCreateCart(req.user.id);
    res.status(201).json({ cart: mapCart(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

const updateSchema = z.object({
  quantity: z.number().int().min(1).max(20),
});

cartRouter.patch('/items/:itemId', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.find((i) => i.id === req.params.itemId);
    if (!item) throw new AppError('Cart item not found', 404);
    if (item.variant.stockQty < data.quantity) {
      throw new AppError('Not enough stock', 400);
    }

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: data.quantity },
    });

    const updated = await getOrCreateCart(req.user.id);
    res.json({ cart: mapCart(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

cartRouter.delete('/items/:itemId', async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.find((i) => i.id === req.params.itemId);
    if (!item) throw new AppError('Cart item not found', 404);

    await prisma.cartItem.delete({ where: { id: item.id } });
    const updated = await getOrCreateCart(req.user.id);
    res.json({ cart: mapCart(updated) });
  } catch (err) {
    next(err);
  }
});
