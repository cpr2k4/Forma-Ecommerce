import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { formatMoney, slugify } from '../../lib/utils.js';
import { createUploader, publicUploadPath, handleMulterError } from '../../lib/upload.js';

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

const uploadProductImage = createUploader('products');

const ORDER_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

function rupeesToCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function mapAdminProduct(product) {
  const minPrice = product.variants.length
    ? Math.min(...product.variants.map((v) => v.priceCents))
    : product.basePriceCents;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    imageUrl: product.imageUrl,
    isPublished: product.isPublished,
    currency: product.currency,
    basePriceCents: product.basePriceCents,
    attributes: product.attributes,
    category: product.category
      ? { id: product.category.id, name: product.category.name, slug: product.category.slug }
      : null,
    price: formatMoney(minPrice, product.currency),
    avgRating: product.avgRating,
    reviewCount: product.reviewCount,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      attrs: v.variantAttrs,
      price: formatMoney(v.priceCents, product.currency),
      priceCents: v.priceCents,
      stockQty: v.stockQty,
      inStock: v.stockQty > 0,
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function mapAdminOrder(order) {
  return {
    id: order.id,
    status: order.status,
    subtotal: formatMoney(order.subtotalCents, order.currency),
    shipping: formatMoney(order.shippingCents, order.currency),
    tax: formatMoney(order.taxCents, order.currency),
    total: formatMoney(order.totalCents, order.currency),
    shippingAddress: order.shippingAddress,
    placedAt: order.placedAt,
    customer: order.user
      ? { id: order.user.id, email: order.user.email, fullName: order.user.fullName }
      : null,
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

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1),
  color: z.string().optional().default(''),
  size: z.string().optional().default(''),
  price: z.union([z.string(), z.number()]),
  stockQty: z.union([z.string(), z.number()]).default(0),
});

const imageUrlSchema = z
  .string()
  .refine((val) => /^https?:\/\//i.test(val) || val.startsWith('/uploads/'), {
    message: 'Image must be a valid URL or an uploaded file path',
  });

const productBodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(1).optional(),
  brand: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  categorySlug: z.string().optional().nullable(),
  imageUrl: z
    .union([imageUrlSchema, z.literal(''), z.null()])
    .optional()
    .nullable(),
  basePrice: z.union([z.string(), z.number()]).optional(),
  isPublished: z.boolean().optional().default(true),
  variants: z.array(variantSchema).min(1),
});

async function resolveCategoryId(categorySlug) {
  if (!categorySlug) return null;
  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) throw new AppError('Category not found', 400);
  return category.id;
}

function buildVariantAttrs(variant) {
  const attrs = {};
  if (variant.color) attrs.color = variant.color;
  if (variant.size) attrs.size = variant.size;
  return attrs;
}

function parseVariantInput(variant) {
  const priceCents = rupeesToCents(variant.price);
  if (priceCents == null) throw new AppError(`Invalid price for SKU ${variant.sku}`, 400);
  const stockQty = Number(variant.stockQty);
  if (!Number.isInteger(stockQty) || stockQty < 0) {
    throw new AppError(`Invalid stock for SKU ${variant.sku}`, 400);
  }
  return {
    id: variant.id,
    sku: variant.sku.trim(),
    variantAttrs: buildVariantAttrs(variant),
    priceCents,
    stockQty,
  };
}

async function loadProductOrThrow(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, variants: true },
  });
  if (!product) throw new AppError('Product not found', 404);
  return product;
}

/** GET /admin/products */
adminRouter.get('/products', async (req, res, next) => {
  try {
    const { q } = req.query;
    const where = {};
    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { brand: { contains: String(q), mode: 'insensitive' } },
        { slug: { contains: String(q), mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { category: true, variants: true },
    });

    res.json({ products: products.map(mapAdminProduct) });
  } catch (err) {
    next(err);
  }
});

/** POST /admin/products/upload-image — multipart field name: image */
adminRouter.post(
  '/products/upload-image',
  uploadProductImage.single('image'),
  handleMulterError,
  (req, res, next) => {
    try {
      if (!req.file) throw new AppError('Product image is required', 400);
      const imageUrl = publicUploadPath('products', req.file.filename);
      res.json({ imageUrl });
    } catch (err) {
      next(err);
    }
  }
);

/** GET /admin/products/:id */
adminRouter.get('/products/:id', async (req, res, next) => {
  try {
    const product = await loadProductOrThrow(req.params.id);
    res.json({ product: mapAdminProduct(product) });
  } catch (err) {
    next(err);
  }
});

/** POST /admin/products */
adminRouter.post('/products', async (req, res, next) => {
  try {
    const data = productBodySchema.parse(req.body);
    const slug = (data.slug || slugify(data.name)).trim();
    const variants = data.variants.map(parseVariantInput);

    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) throw new AppError('Slug already in use', 409);

    const skus = variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) throw new AppError('Duplicate SKUs in request', 400);
    const existingSku = await prisma.productVariant.findFirst({ where: { sku: { in: skus } } });
    if (existingSku) throw new AppError(`SKU already exists: ${existingSku.sku}`, 409);

    const categoryId = await resolveCategoryId(data.categorySlug || null);
    const baseFromForm = data.basePrice != null ? rupeesToCents(data.basePrice) : null;
    const basePriceCents =
      baseFromForm ?? Math.min(...variants.map((v) => v.priceCents));

    const product = await prisma.product.create({
      data: {
        name: data.name.trim(),
        slug,
        brand: data.brand || null,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        categoryId,
        basePriceCents,
        isPublished: data.isPublished ?? true,
        variants: {
          create: variants.map(({ sku, variantAttrs, priceCents, stockQty }) => ({
            sku,
            variantAttrs,
            priceCents,
            stockQty,
          })),
        },
      },
      include: { category: true, variants: true },
    });

    res.status(201).json({ product: mapAdminProduct(product) });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

/** PATCH /admin/products/:id */
adminRouter.patch('/products/:id', async (req, res, next) => {
  try {
    const data = productBodySchema.parse(req.body);
    const existing = await loadProductOrThrow(req.params.id);
    const slug = (data.slug || slugify(data.name)).trim();
    const variants = data.variants.map(parseVariantInput);

    if (slug !== existing.slug) {
      const clash = await prisma.product.findUnique({ where: { slug } });
      if (clash) throw new AppError('Slug already in use', 409);
    }

    const skus = variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) throw new AppError('Duplicate SKUs in request', 400);

    for (const v of variants) {
      const other = await prisma.productVariant.findFirst({
        where: {
          sku: v.sku,
          ...(v.id
            ? { NOT: { id: v.id } }
            : { NOT: { productId: existing.id } }),
        },
      });
      if (other) throw new AppError(`SKU already exists: ${v.sku}`, 409);
    }

    const categoryId = await resolveCategoryId(data.categorySlug || null);
    const baseFromForm = data.basePrice != null ? rupeesToCents(data.basePrice) : null;
    const basePriceCents =
      baseFromForm ?? Math.min(...variants.map((v) => v.priceCents));

    const keptIds = variants.map((v) => v.id).filter(Boolean);
    const toDelete = existing.variants.filter((v) => !keptIds.includes(v.id));

    for (const v of toDelete) {
      const inOrders = await prisma.orderItem.count({ where: { variantId: v.id } });
      const inCarts = await prisma.cartItem.count({ where: { variantId: v.id } });
      if (inOrders > 0) {
        throw new AppError(
          `Cannot remove SKU ${v.sku} — it appears on past orders. Unpublish the product instead.`,
          400
        );
      }
      if (inCarts > 0) {
        await prisma.cartItem.deleteMany({ where: { variantId: v.id } });
      }
      await prisma.productVariant.delete({ where: { id: v.id } });
    }

    for (const v of variants) {
      if (v.id && existing.variants.some((ev) => ev.id === v.id)) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: {
            sku: v.sku,
            variantAttrs: v.variantAttrs,
            priceCents: v.priceCents,
            stockQty: v.stockQty,
          },
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: existing.id,
            sku: v.sku,
            variantAttrs: v.variantAttrs,
            priceCents: v.priceCents,
            stockQty: v.stockQty,
          },
        });
      }
    }

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: data.name.trim(),
        slug,
        brand: data.brand || null,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        categoryId,
        basePriceCents,
        isPublished: data.isPublished ?? true,
      },
      include: { category: true, variants: true },
    });

    res.json({ product: mapAdminProduct(product) });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

/** DELETE /admin/products/:id */
adminRouter.delete('/products/:id', async (req, res, next) => {
  try {
    const product = await loadProductOrThrow(req.params.id);
    const variantIds = product.variants.map((v) => v.id);

    if (variantIds.length) {
      const orderCount = await prisma.orderItem.count({
        where: { variantId: { in: variantIds } },
      });
      if (orderCount > 0) {
        throw new AppError(
          'Cannot delete product with order history. Unpublish it instead.',
          400
        );
      }
      await prisma.cartItem.deleteMany({ where: { variantId: { in: variantIds } } });
      await prisma.review.deleteMany({ where: { productId: product.id } });
    }

    await prisma.product.delete({ where: { id: product.id } });
    res.json({ ok: true, id: product.id });
  } catch (err) {
    next(err);
  }
});

/** GET /admin/inventory */
adminRouter.get('/inventory', async (_req, res, next) => {
  try {
    const variants = await prisma.productVariant.findMany({
      include: {
        product: { include: { category: true } },
      },
      orderBy: { sku: 'asc' },
    });

    res.json({
      items: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        attrs: v.variantAttrs,
        stockQty: v.stockQty,
        price: formatMoney(v.priceCents, v.product.currency),
        product: {
          id: v.product.id,
          name: v.product.name,
          slug: v.product.slug,
          isPublished: v.product.isPublished,
          category: v.product.category
            ? { name: v.product.category.name, slug: v.product.category.slug }
            : null,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** PATCH /admin/inventory/:variantId */
adminRouter.patch('/inventory/:variantId', async (req, res, next) => {
  try {
    const schema = z.object({
      stockQty: z.number().int().min(0),
    });
    const { stockQty } = schema.parse({
      stockQty: Number(req.body.stockQty),
    });

    const existing = await prisma.productVariant.findUnique({
      where: { id: req.params.variantId },
      include: { product: true },
    });
    if (!existing) throw new AppError('Variant not found', 404);

    const variant = await prisma.productVariant.update({
      where: { id: existing.id },
      data: { stockQty },
      include: { product: true },
    });

    res.json({
      item: {
        id: variant.id,
        sku: variant.sku,
        stockQty: variant.stockQty,
        product: { id: variant.product.id, name: variant.product.name },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

/** GET /admin/categories */
adminRouter.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, parentId: true },
    });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

/** POST /admin/categories */
adminRouter.post('/categories', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      slug: z.string().min(1).optional(),
    });
    const data = schema.parse(req.body);
    const slug = (data.slug || slugify(data.name)).trim();
    const clash = await prisma.category.findUnique({ where: { slug } });
    if (clash) throw new AppError('Category slug already exists', 409);

    const category = await prisma.category.create({
      data: { name: data.name.trim(), slug },
      select: { id: true, name: true, slug: true, parentId: true },
    });
    res.status(201).json({ category });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

/** GET /admin/orders */
adminRouter.get('/orders', async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { placedAt: 'desc' },
    });
    res.json({ orders: orders.map(mapAdminOrder) });
  } catch (err) {
    next(err);
  }
});

/** PATCH /admin/orders/:id/status */
adminRouter.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(ORDER_STATUSES),
    });
    const { status } = schema.parse(req.body);

    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!existing) throw new AppError('Order not found', 404);

    const order = await prisma.order.update({
      where: { id: existing.id },
      data: { status },
      include: {
        items: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    });

    res.json({ order: mapAdminOrder(order) });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

/** GET /admin/stats — dashboard counts */
adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const [productCount, variants, orderCount] = await Promise.all([
      prisma.product.count(),
      prisma.productVariant.findMany({ select: { stockQty: true } }),
      prisma.order.count(),
    ]);

    const lowStock = variants.filter((v) => v.stockQty > 0 && v.stockQty <= 8).length;
    const outOfStock = variants.filter((v) => v.stockQty === 0).length;

    res.json({
      products: productCount,
      variants: variants.length,
      lowStock,
      outOfStock,
      orders: orderCount,
    });
  } catch (err) {
    next(err);
  }
});
