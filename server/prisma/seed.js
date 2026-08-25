import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  const customerPasswordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('Password', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      passwordHash: adminPasswordHash,
      fullName: 'Store Admin',
      role: 'ADMIN',
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'demo@shop.com',
      passwordHash: customerPasswordHash,
      fullName: 'Demo Customer',
      phone: '9876543210',
      role: 'CUSTOMER',
    },
  });

  await prisma.cart.create({ data: { userId: admin.id } });
  await prisma.cart.create({ data: { userId: customer.id } });

  const electronics = await prisma.category.create({
    data: { name: 'Electronics', slug: 'electronics' },
  });
  const fashion = await prisma.category.create({
    data: { name: 'Fashion', slug: 'fashion' },
  });
  const home = await prisma.category.create({
    data: { name: 'Home', slug: 'home' },
  });

  const products = [
    {
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Noise-cancelling over-ear headphones with 30-hour battery life.',
      brand: 'SoundPeak',
      basePriceCents: 799900,
      categoryId: electronics.id,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      attributes: { battery: '30h', connectivity: 'Bluetooth 5.3' },
      variants: [
        { sku: 'WH-BLK', variantAttrs: { color: 'Black' }, priceCents: 799900, stockQty: 40 },
        { sku: 'WH-WHT', variantAttrs: { color: 'White' }, priceCents: 829900, stockQty: 25 },
      ],
    },
    {
      name: 'Smart Watch',
      slug: 'smart-watch',
      description: 'Track fitness, heart rate, and notifications on your wrist.',
      brand: 'PulseTech',
      basePriceCents: 1299900,
      categoryId: electronics.id,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      attributes: { waterproof: '5ATM', display: 'AMOLED' },
      variants: [
        { sku: 'SW-42', variantAttrs: { size: '42mm' }, priceCents: 1299900, stockQty: 30 },
        { sku: 'SW-46', variantAttrs: { size: '46mm' }, priceCents: 1499900, stockQty: 18 },
      ],
    },
    {
      name: 'Classic Leather Jacket',
      slug: 'classic-leather-jacket',
      description: 'Genuine leather jacket with a modern slim fit.',
      brand: 'UrbanHide',
      basePriceCents: 999900,
      categoryId: fashion.id,
      imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
      attributes: { material: 'Leather' },
      variants: [
        { sku: 'LJ-M', variantAttrs: { size: 'M' }, priceCents: 999900, stockQty: 12 },
        { sku: 'LJ-L', variantAttrs: { size: 'L' }, priceCents: 999900, stockQty: 10 },
        { sku: 'LJ-XL', variantAttrs: { size: 'XL' }, priceCents: 999900, stockQty: 8 },
      ],
    },
    {
      name: 'Running Sneakers',
      slug: 'running-sneakers',
      description: 'Lightweight sneakers built for daily runs and all-day comfort.',
      brand: 'Stride',
      basePriceCents: 549900,
      categoryId: fashion.id,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      attributes: { sole: 'Foam cushion' },
      variants: [
        { sku: 'RS-8', variantAttrs: { size: '8' }, priceCents: 549900, stockQty: 20 },
        { sku: 'RS-9', variantAttrs: { size: '9' }, priceCents: 549900, stockQty: 22 },
        { sku: 'RS-10', variantAttrs: { size: '10' }, priceCents: 549900, stockQty: 15 },
      ],
    },
    {
      name: 'Ceramic Pour-Over Set',
      slug: 'ceramic-pour-over-set',
      description: 'Minimal ceramic dripper and mug set for morning coffee rituals.',
      brand: 'BrewHome',
      basePriceCents: 249900,
      categoryId: home.id,
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
      attributes: { pieces: 2 },
      variants: [
        { sku: 'PO-SAGE', variantAttrs: { color: 'Sage' }, priceCents: 249900, stockQty: 35 },
        { sku: 'PO-CLAY', variantAttrs: { color: 'Clay' }, priceCents: 249900, stockQty: 28 },
      ],
    },
    {
      name: 'Desk Lamp',
      slug: 'desk-lamp',
      description: 'Adjustable LED desk lamp with warm and cool light modes.',
      brand: 'Lumen',
      basePriceCents: 329900,
      categoryId: home.id,
      imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
      attributes: { power: 'USB-C' },
      variants: [
        { sku: 'DL-BLK', variantAttrs: { color: 'Matte Black' }, priceCents: 329900, stockQty: 40 },
      ],
    },
  ];

  for (const p of products) {
    const { variants, ...productData } = p;
    await prisma.product.create({
      data: {
        ...productData,
        variants: { create: variants },
      },
    });
  }

  console.log('Seed complete.');
  console.log('Demo accounts:');
  console.log('  Customer: demo@shop.com / password123');
  console.log('  Admin:    admin@gmail.com / Password');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
