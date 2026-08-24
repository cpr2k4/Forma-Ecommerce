import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { formatMoney } from '../../lib/utils.js';

export const catalogRouter = Router();

function mapProduct(product) {
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
    category: product.category
      ? { id: product.category.id, name: product.category.name, slug: product.category.slug }
      : null,
    price: formatMoney(minPrice, product.currency),
    avgRating: product.avgRating,
    reviewCount: product.reviewCount,
    attributes: product.attributes,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      attrs: v.variantAttrs,
      price: formatMoney(v.priceCents, product.currency),
      stockQty: v.stockQty,
      inStock: v.stockQty > 0,
    })),
  };
}

catalogRouter.get('/', async (req, res, next) => {
  try {
    const { q, category, sort = 'newest' } = req.query;

    const where = { isPublished: true };
    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { description: { contains: String(q), mode: 'insensitive' } },
        { brand: { contains: String(q), mode: 'insensitive' } },
      ];
    }
    if (category) {
      where.category = { slug: String(category) };
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { basePriceCents: 'asc' };
    if (sort === 'price_desc') orderBy = { basePriceCents: 'desc' };
    if (sort === 'rating') orderBy = { avgRating: 'desc' };

    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        category: true,
        variants: true,
      },
    });

    res.json({ products: products.map(mapProduct) });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/categories', async (_req, res, next) => {
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

catalogRouter.get('/:slug', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, isPublished: true },
      include: {
        category: true,
        variants: true,
        reviews: {
          include: { user: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) throw new AppError('Product not found', 404);

    res.json({
      product: {
        ...mapProduct(product),
        reviews: product.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          author: r.user.fullName,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});
