import { prisma } from '../../lib/prisma.js';
import { formatMoney } from '../../lib/utils.js';

const FAQ = [
  {
    keys: ['ship', 'delivery', 'deliver', 'shipping', 'how long', 'when will'],
    reply:
      'We ship across India in 3–7 business days. You’ll get an order confirmation as soon as payment clears, and you can track status anytime under Orders.',
  },
  {
    keys: ['return', 'refund', 'exchange', 'replace'],
    reply:
      'Returns are accepted within 7 days of delivery if the item is unused and in original packaging. Open Orders, pick the order, and request a return — refunds usually land in 5–7 business days after we receive the item.',
  },
  {
    keys: ['payment', 'pay', 'razorpay', 'upi', 'card', 'cod', 'cash'],
    reply:
      'We accept UPI, cards, and netbanking via Razorpay at checkout. Cash on delivery isn’t available in this MVP build yet.',
  },
  {
    keys: ['cart', 'checkout', 'buy', 'purchase', 'how to order'],
    reply:
      'Browse Shop, open a product, pick a variant, then Add to cart. When you’re ready, open Cart → Checkout, confirm your address, and pay securely.',
  },
  {
    keys: ['account', 'login', 'register', 'sign up', 'password'],
    reply:
      'Create an account from Log in → Register. You’ll need it to keep your cart, place orders, and view order history.',
  },
  {
    keys: ['order status', 'track', 'my order', 'where is my'],
    reply:
      'If you’re logged in, head to Orders for live status (Pending → Paid → Processing → Shipped → Delivered). Need something specific? Tell me the product name and I’ll help look it up.',
  },
  {
    keys: ['hello', 'hi', 'hey', 'good morning', 'good evening'],
    reply:
      'Hi — I’m FORMA Assist. Ask me about shipping, returns, payments, or products in the shop. Try “show me lamps” or “what do you sell?”',
  },
  {
    keys: ['help', 'support', 'contact', 'assist'],
    reply:
      'I can help with shipping, returns, payments, checkout, and finding products. For account-specific issues, email support@forma.local (demo). What do you need?',
  },
];

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchFaq(message) {
  const text = normalize(message);
  for (const item of FAQ) {
    if (item.keys.some((key) => text.includes(key))) {
      return item.reply;
    }
  }
  return null;
}

function extractSearchQuery(message) {
  const text = normalize(message);
  const patterns = [
    /(?:show|find|search|looking for|recommend|suggest|any|have|sell|got)\s+(?:me\s+)?(?:some\s+)?(.+)/,
    /(?:products?|items?)\s+(?:like|for|about)?\s*(.+)/,
    /what\s+(?:do you|products?|items?).*/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1]
        .replace(/\b(please|thanks|thank you|for me|in stock|available|products?|items?|things|stuff)\b/g, '')
        .trim();
      // Empty after cleanup = browse catalog (e.g. "show me products")
      return cleaned;
    }
  }

  if (/\b(product|catalog|shop|collection|sell|available)\b/.test(text)) {
    return '';
  }

  return null;
}

async function findProducts(query) {
  const where = { isPublished: true };
  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { brand: { contains: query, mode: 'insensitive' } },
      { category: { name: { contains: query, mode: 'insensitive' } } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    take: 5,
    orderBy: query ? { avgRating: 'desc' } : { createdAt: 'desc' },
    include: { category: true, variants: true },
  });

  return products.map((product) => {
    const minPrice = product.variants.length
      ? Math.min(...product.variants.map((v) => v.priceCents))
      : product.basePriceCents;
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category?.name || null,
      price: formatMoney(minPrice, product.currency).formatted,
    };
  });
}

/**
 * Rule-based assistantReply — swap this for an LLM later without changing the route.
 */
export async function assistantReply(message, { userId } = {}) {
  const trimmed = String(message || '').trim();
  if (!trimmed) {
    return {
      reply: 'Send me a short question and I’ll help.',
      suggestions: ['Shipping info', 'Return policy', 'Show products'],
      products: [],
    };
  }

  const searchQuery = extractSearchQuery(trimmed);
  if (searchQuery !== null) {
    const products = await findProducts(searchQuery);
    if (!products.length) {
      return {
        reply: searchQuery
          ? `I couldn’t find anything matching “${searchQuery}”. Try another keyword, or browse the full Shop.`
          : 'The catalog looks empty right now. Check back after seeding products.',
        suggestions: ['Show products', 'Shipping info', 'How to checkout'],
        products: [],
      };
    }

    const list = products.map((p) => `• ${p.name} — ${p.price}`).join('\n');
    const greeting = userId ? 'Here are a few picks for you' : 'Here are some picks from the shop';
    return {
      reply: `${greeting}:\n${list}\n\nOpen any product from Shop to see details and add to cart.`,
      suggestions: ['Shipping info', 'How to checkout', 'Return policy'],
      products,
    };
  }

  const faqReply = matchFaq(trimmed);
  if (faqReply) {
    return {
      reply: faqReply,
      suggestions: ['Show products', 'How to checkout', 'Return policy'],
      products: [],
    };
  }

  // Soft product search fallback: treat short messages as catalog queries
  if (trimmed.split(/\s+/).length <= 4) {
    const products = await findProducts(trimmed);
    if (products.length) {
      const list = products.map((p) => `• ${p.name} — ${p.price}`).join('\n');
      return {
        reply: `I found these related to “${trimmed}”:\n${list}`,
        suggestions: ['Shipping info', 'How to checkout'],
        products,
      };
    }
  }

  return {
    reply:
      "I’m not sure about that yet. Try asking about shipping, returns, payments, or say “show me [product]” and I’ll search the catalog.",
    suggestions: ['Shipping info', 'Show products', 'Return policy', 'How to checkout'],
    products: [],
  };
}
