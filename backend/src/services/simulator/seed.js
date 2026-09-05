require('dotenv').config();

const mongoose = require('mongoose');

const Customer = require('../../models/Customer');
const Product = require('../../models/Product');
const Order = require('../../models/Order');

const DEFAULT_CUSTOMERS = 500;
const DEFAULT_ORDERS = 4000;
const DEFAULT_SEED = 42;

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function makeDateRange(random, startDaysAgo, endDaysAgo) {
  const start = Date.now() - startDaysAgo * 24 * 60 * 60 * 1000;
  const end = Date.now() - endDaysAgo * 24 * 60 * 60 * 1000;
  const range = end - start;
  return new Date(start + random() * range);
}

function buildCatalog() {
  return [
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Running Shoes', category: 'Footwear', price: 79900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Sports Socks', category: 'Accessories', price: 12900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Trail Running Shoes', category: 'Footwear', price: 89900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Training Tee', category: 'Apparel', price: 24900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Compression Tights', category: 'Fitness', price: 39900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Yoga Mat', category: 'Fitness', price: 27900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Water Bottle', category: 'Accessories', price: 14900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Performance Cap', category: 'Apparel', price: 19900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Running Watch', category: 'Accessories', price: 59900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Gym Bag', category: 'Accessories', price: 34900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Cross-Training Shoes', category: 'Footwear', price: 74900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Athletic Shorts', category: 'Apparel', price: 22900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Resistance Bands', category: 'Fitness', price: 18900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Smart Bottle', category: 'Accessories', price: 16900 },
    { ownerId: null, sessionId: null, expiresAt: null, name: 'Recovery Foam Roller', category: 'Fitness', price: 24900 },
  ];
}

/**
 * Qualifying product pairs planted into the seed data.
 * Each pair targets a different category combination and affinity tier,
 * with enough base customers (25+) to clear MIN_BASE_CUSTOMERS (20).
 *
 * The `poolSize` fraction controls how many customers are assigned to
 * the pool that buys the base product; `targetAffinity` controls what
 * fraction of those base-buyers also co-purchase the target product.
 */
const QUALIFYING_PAIRS = [
  { base: 'Running Shoes',  target: 'Sports Socks',      poolSize: 0.18, targetAffinity: 0.90 },
  { base: 'Yoga Mat',       target: 'Resistance Bands',  poolSize: 0.14, targetAffinity: 0.75 },
  { base: 'Training Tee',   target: 'Athletic Shorts',   poolSize: 0.12, targetAffinity: 0.68 },
];

function buildCustomers(customerCount, random) {
  const firstNames = [
    'Aarav', 'Aisha', 'Ananya', 'Arjun', 'Diya', 'Ethan', 'Ishaan', 'Kavya', 'Meera', 'Neha',
    'Rohan', 'Saanvi', 'Siddharth', 'Tara', 'Vihaan', 'Zoya', 'Riya', 'Kabir', 'Priya', 'Yash'
  ];
  const lastNames = [
    'Sharma', 'Patel', 'Nair', 'Reddy', 'Iyer', 'Singh', 'Mehta', 'Khanna', 'Rao', 'Joshi',
    'Sen', 'Kapoor', 'Das', 'Mishra', 'Verma', 'Kulkarni', 'Bose', 'Agarwal', 'Chopra', 'Roy'
  ];
  const segments = ['High Value', 'Fitness Enthusiast', 'Frequent Buyer', 'Occasional Buyer', 'New Customer'];

  // Pre-compute non-overlapping customer index ranges for each affinity pool.
  // Customers not assigned to any pool behave normally (organic noise only).
  const pools = [];
  let cursor = 0;
  for (const pair of QUALIFYING_PAIRS) {
    const size = Math.max(25, Math.floor(customerCount * pair.poolSize));
    pools.push({ ...pair, startIndex: cursor, endIndex: cursor + size });
    cursor += size;
  }

  return Array.from({ length: customerCount }, (_, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[(index * 3) % lastNames.length];
    const segment = segments[index % segments.length];

    // Determine which affinity pool (if any) this customer belongs to
    let affinityPool = null;
    for (const pool of pools) {
      if (index >= pool.startIndex && index < pool.endIndex) {
        affinityPool = { base: pool.base, target: pool.target, targetAffinity: pool.targetAffinity };
        break;
      }
    }

    return {
      _id: new mongoose.Types.ObjectId(),
      ownerId: null,
      sessionId: null,
      expiresAt: null,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@revora.example`,
      segment,
      totalSpend: 0,
      orderCount: 0,
      lastPurchaseAt: null,
      __profile: {
        affinityPool,
        preferredCategory: ['Footwear', 'Fitness', 'Apparel', 'Accessories'][index % 4],
      },
    };
  });
}

function choosePrimaryProduct(profile, products, random) {
  // Pool customers are biased toward their base product's category
  const preferredCategories = [profile.preferredCategory];
  if (profile.affinityPool) {
    const baseProduct = products.find((p) => p.name === profile.affinityPool.base);
    if (baseProduct && !preferredCategories.includes(baseProduct.category)) {
      preferredCategories.unshift(baseProduct.category);
    }
  }

  const categoryOrder = [...preferredCategories, 'Footwear', 'Fitness', 'Apparel', 'Accessories'];
  const categoryCandidates = [...new Set(categoryOrder.filter(Boolean))];
  const matchingProducts = products.filter((product) => categoryCandidates.includes(product.category));

  if (matchingProducts.length === 0) {
    return products[0];
  }

  return matchingProducts[Math.floor(random() * matchingProducts.length)];
}

function generateHistoricalOrders(customers, products, orderCount, random) {
  const productByName = new Map(products.map((product) => [product.name, product]));

  const orders = [];

  for (let index = 0; index < orderCount; index += 1) {
    const customer = customers[index % customers.length];
    const orderDate = makeDateRange(random, 540, 30);

    const basket = [];
    const baseProduct = choosePrimaryProduct(customer.__profile, products, random);
    basket.push(baseProduct);

    // Organic cross-sell: if the customer is in an affinity pool and the
    // primary product matches the pair's base, co-add the target product
    // at the pair's target affinity probability.
    const pool = customer.__profile.affinityPool;
    if (pool && baseProduct.name === pool.base && random() < pool.targetAffinity) {
      const targetProduct = productByName.get(pool.target);
      if (targetProduct) {
        basket.push(targetProduct);
      }
    }

    if (random() < 0.6) {
      const additional = products.filter((product) => product._id.toString() !== baseProduct._id.toString());
      const extra = additional[Math.floor(random() * additional.length)];
      basket.push(extra);
    }

    if (basket.length > 3) {
      basket.splice(3);
    }

    const uniqueBasket = [];
    const seen = new Set();
    for (const item of basket) {
      const key = item._id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueBasket.push(item);
      }
    }

    const amount = uniqueBasket.reduce((total, product) => total + product.price, 0);

    orders.push({
      customerId: customer._id,
      productIds: uniqueBasket.map((product) => product._id),
      ownerId: null,
      sessionId: null,
      expiresAt: null,
      amount,
      source: 'historical',
      status: 'completed',
      razorpayOrderId: undefined,
      razorpayPaymentId: undefined,
      createdAt: orderDate,
    });
  }

  // Plant guaranteed co-purchase orders for each qualifying pair.
  // For every pool, a fraction of the pool's customers (equal to the target
  // affinity) get a dedicated base+target order. This ensures that even after
  // organic noise, each pair's measured affinity stays near its target.
  let plantedCount = 0;
  for (const pair of QUALIFYING_PAIRS) {
    const baseProduct = productByName.get(pair.base);
    const targetProduct = productByName.get(pair.target);
    if (!baseProduct || !targetProduct) continue;

    const poolCustomers = customers.filter(
      (c) => c.__profile.affinityPool && c.__profile.affinityPool.base === pair.base
    );
    const crossSellCount = Math.max(1, Math.floor(poolCustomers.length * pair.targetAffinity));

    for (let i = 0; i < crossSellCount; i += 1) {
      const customer = poolCustomers[i];
      const orderDate = makeDateRange(random, 400, 10);
      const basket = [baseProduct, targetProduct];
      const amount = basket.reduce((total, product) => total + product.price, 0);

      orders.push({
        customerId: customer._id,
        productIds: basket.map((product) => product._id),
        ownerId: null,
        sessionId: null,
        expiresAt: null,
        amount,
        source: 'historical',
        status: 'completed',
        razorpayOrderId: undefined,
        razorpayPaymentId: undefined,
        createdAt: orderDate,
      });
      plantedCount += 1;
    }
  }

  return orders.slice(0, orderCount + plantedCount);
}

async function reseedDatabase({ reset, customerCount, orderCount, seed }) {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  await mongoose.connect(mongoUri);

  const collections = ['orders', 'customers', 'products', 'experiments', 'auditlogs'];

  if (reset) {
    for (const collectionName of collections) {
      const collection = mongoose.connection.db.collection(collectionName);
      await collection.drop().catch(() => {});
    }
  } else {
    const existingCounts = await Promise.all(
      collections.map((collectionName) => mongoose.connection.db.collection(collectionName).countDocuments())
    );

    if (existingCounts.some((count) => count > 0)) {
      throw new Error(
        'Merchant data already exists. Use --reset or set SEED_RESET=true to reseed the simulated dataset.'
      );
    }
  }

  const random = createSeededRandom(seed);
  const catalog = buildCatalog();
  const createdProducts = await Product.create(catalog);
  const productLookup = new Map(createdProducts.map((product) => [product.name, product]));

  const customerProfiles = buildCustomers(customerCount, random);
  const createdCustomers = await Customer.create(
    customerProfiles.map(({ __profile, ...customer }) => customer)
  );
  const runtimeCustomerProfiles = createdCustomers.map((customer, index) => ({
    ...customer.toObject(),
    __profile: customerProfiles[index].__profile,
  }));

  const orders = generateHistoricalOrders(runtimeCustomerProfiles, createdProducts, orderCount, random);
  const createdOrders = await Order.create(orders);

  const customerMap = new Map(createdCustomers.map((customer) => [customer._id.toString(), customer]));
  const aggregatedTotals = new Map();
  const aggregatedCounts = new Map();
  const aggregatedLastPurchase = new Map();

  for (const order of createdOrders) {
    const customerId = order.customerId.toString();
    const currentTotal = aggregatedTotals.get(customerId) || 0;
    const currentCount = aggregatedCounts.get(customerId) || 0;
    const currentLast = aggregatedLastPurchase.get(customerId) || new Date(0);

    aggregatedTotals.set(customerId, currentTotal + order.amount);
    aggregatedCounts.set(customerId, currentCount + 1);
    aggregatedLastPurchase.set(
      customerId,
      order.createdAt > currentLast ? order.createdAt : currentLast
    );
  }

  for (const customer of createdCustomers) {
    const customerId = customer._id.toString();
    const totalSpend = aggregatedTotals.get(customerId) || 0;
    const orderCount = aggregatedCounts.get(customerId) || 0;
    const lastPurchaseAt = aggregatedLastPurchase.get(customerId) || null;

    await Customer.findByIdAndUpdate(customer._id, {
      totalSpend,
      orderCount,
      lastPurchaseAt,
    });

    customerMap.set(customerId, {
      ...customer.toObject(),
      totalSpend,
      orderCount,
      lastPurchaseAt,
    });
  }

  console.log('Seeded simulated merchant data');
  console.log(`Customers: ${createdCustomers.length}`);
  console.log(`Products: ${createdProducts.length}`);
  console.log(`Historical orders: ${createdOrders.length}`);

  for (const pair of QUALIFYING_PAIRS) {
    const baseProduct = productLookup.get(pair.base);
    const targetProduct = productLookup.get(pair.target);
    if (!baseProduct || !targetProduct) continue;
    const pairOrders = createdOrders.filter((order) => {
      const hasBase = order.productIds.some((id) => id.toString() === baseProduct._id.toString());
      const hasTarget = order.productIds.some((id) => id.toString() === targetProduct._id.toString());
      return hasBase && hasTarget;
    }).length;
    console.log(`Cross-sell orders ${pair.base} + ${pair.target} (~${Math.round(pair.targetAffinity * 100)}%): ${pairOrders}`);
  }

  console.log(`Seed: ${seed}`);

  await mongoose.disconnect();
}

async function main() {
  const reset = process.argv.includes('--reset') || process.env.SEED_RESET === 'true';
  const customerCount = clamp(Number(process.env.SEED_CUSTOMER_COUNT || DEFAULT_CUSTOMERS), 1, 5000);
  const orderCount = clamp(Number(process.env.SEED_ORDER_COUNT || DEFAULT_ORDERS), 3000, 50000);
  const seed = Number(process.env.SEED_RANDOM_SEED || DEFAULT_SEED);

  try {
    await reseedDatabase({
      reset,
      customerCount,
      orderCount,
      seed,
    });
  } catch (error) {
    console.error('Simulator failed:', error.message);
    process.exit(1);
  }
}

main();
