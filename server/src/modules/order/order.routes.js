import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { formatMoney } from '../../lib/utils.js';
import { requireRazorpay, verifyRazorpaySignature } from '../../lib/razorpay.js';

export const orderRouter = Router();

orderRouter.use(authenticate);

const checkoutSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(8),
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().optional(),
    postalCode: z.string().min(4),
    country: z.string().default('IN'),
  }),
});

const confirmSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

function mapOrder(order) {
  return {
    id: order.id,
    status: order.status,
    subtotal: formatMoney(order.subtotalCents, order.currency),
    shipping: formatMoney(order.shippingCents, order.currency),
    tax: formatMoney(order.taxCents, order.currency),
    total: formatMoney(order.totalCents, order.currency),
    shippingAddress: order.shippingAddress,
    placedAt: order.placedAt,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      attrs: item.variantAttrs,
      quantity: item.quantity,
      unitPrice: formatMoney(item.unitPriceCents, order.currency),
      lineTotal: formatMoney(item.lineTotalCents, order.currency),
    })),
  };
}

orderRouter.get('/', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: true },
      orderBy: { placedAt: 'desc' },
    });
    res.json({ orders: orders.map(mapOrder) });
  } catch (err) {
    next(err);
  }
});

orderRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { items: true },
    });
    if (!order) throw new AppError('Order not found', 404);
    res.json({ order: mapOrder(order) });
  } catch (err) {
    next(err);
  }
});

/** Create PENDING order + Razorpay order; stock updates only after payment verifies */
orderRouter.post('/checkout', async (req, res, next) => {
  try {
    const razorpay = requireRazorpay();
    const data = checkoutSchema.parse(req.body);

    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    for (const item of cart.items) {
      if (item.variant.stockQty < item.quantity) {
        throw new AppError(`Not enough stock for ${item.variant.product.name}`, 400);
      }
    }

    const subtotalCents = cart.items.reduce(
      (sum, item) => sum + item.variant.priceCents * item.quantity,
      0
    );
    const shippingCents = subtotalCents >= 99900 ? 0 : 4900;
    const taxCents = Math.round(subtotalCents * 0.05);
    const totalCents = subtotalCents + shippingCents + taxCents;

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        status: 'PENDING',
        subtotalCents,
        shippingCents,
        taxCents,
        totalCents,
        currency: 'INR',
        shippingAddress: data.shippingAddress,
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            productName: item.variant.product.name,
            variantAttrs: item.variant.variantAttrs,
            unitPriceCents: item.variant.priceCents,
            quantity: item.quantity,
            lineTotalCents: item.variant.priceCents * item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: totalCents,
      currency: 'INR',
      receipt: order.id.slice(0, 40),
      notes: {
        orderId: order.id,
        userId: req.user.id,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'razorpay',
        providerPaymentId: razorpayOrder.id,
        amountCents: totalCents,
        currency: 'INR',
        status: 'INITIATED',
      },
    });

    res.status(201).json({
      order: mapOrder({ ...order, razorpayOrderId: razorpayOrder.id }),
      razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: totalCents,
        currency: 'INR',
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});

/** Verify Razorpay signature, then mark PAID + decrement stock + clear cart */
orderRouter.post('/:id/confirm-payment', async (req, res, next) => {
  try {
    const payload = confirmSchema.parse(req.body);

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { items: true },
    });
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'PAID') {
      return res.json({ order: mapOrder(order), message: 'Order already paid' });
    }
    if (!order.razorpayOrderId || order.razorpayOrderId !== payload.razorpay_order_id) {
      throw new AppError('Razorpay order mismatch', 400);
    }

    const valid = verifyRazorpaySignature({
      orderId: payload.razorpay_order_id,
      paymentId: payload.razorpay_payment_id,
      signature: payload.razorpay_signature,
    });
    if (!valid) throw new AppError('Invalid payment signature', 400);

    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });

    const paidOrder = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const updated = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            stockQty: { gte: item.quantity },
          },
          data: {
            stockQty: { decrement: item.quantity },
          },
        });
        if (updated.count === 0) {
          throw new AppError(`Not enough stock for ${item.productName}`, 400);
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
        include: { items: true },
      });

      await tx.payment.updateMany({
        where: { orderId: order.id, provider: 'razorpay' },
        data: {
          providerPaymentId: payload.razorpay_payment_id,
          status: 'SUCCEEDED',
          rawResponse: payload,
        },
      });

      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return updatedOrder;
    });

    res.json({
      order: mapOrder(paidOrder),
      message: 'Payment successful',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0].message, 400));
    }
    next(err);
  }
});
