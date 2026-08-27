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
    { name: 'Running Shoes', category: 'Footwear', price: 79900 },
    { name: 'Sports Socks', category: 'Accessories', price: 12900 },
    { name: 'Trail Running Shoes', category: 'Footwear', price: 89900 },
    { name: 'Training Tee', category: 'Apparel', price: 24900 },
    { name: 'Compression Tights', category: 'Fitness', price: 39900 },
    { name: 'Yoga Mat', category: 'Fitness', price: 27900 },
    { name: 'Water Bottle', category: 'Accessories', price: 14900 },
    { name: 'Performance Cap', category: 'Apparel', price: 19900 },
    { name: 'Running Watch', category: 'Accessories', price: 59900 },
    { name: 'Gym Bag', category: 'Accessories', price: 34900 },
    { name: 'Cross-Training Shoes', category: 'Footwear', price: 74900 },
    { name: 'Athletic Shorts', category: 'Apparel', price: 22900 },
    { name: 'Resistance Bands', category: 'Fitness', price: 18900 },
    { name: 'Smart Bottle', category: 'Accessories', price: 16900 },
    { name: 'Recovery Foam Roller', category: 'Fitness', price: 24900 },
  ];
}

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

  return Array.from({ length: customerCount }, (_, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[(index * 3) % lastNames.length];
    const segment = segments[index % segments.length];

    return {
      _id: new mongoose.Types.ObjectId(),
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@revora.example`,
      segment,
      totalSpend: 0,
      orderCount: 0,
      lastPurchaseAt: null,
      __profile: {
        affinityCustomer: random() < 0.45,
        preferredCategory: ['Footwear', 'Fitness', 'Apparel', 'Accessories'][index % 4],
      },
    };
  });
}

function choosePrimaryProduct(profile, products, random) {
  const categoryOrder = [profile.preferredCategory, 'Footwear', 'Fitness', 'Apparel', 'Accessories'];

  const categoryCandidates = categoryOrder.filter(Boolean);
  const matchingProducts = products.filter((product) => categoryCandidates.includes(product.category));

  if (matchingProducts.length === 0) {
    return products[0];
  }

  return matchingProducts[Math.floor(random() * matchingProducts.length)];
}

function generateHistoricalOrders(customers, products, orderCount, random) {
  const productByName = new Map(products.map((product) => [product.name, product]));
  const runningShoesProduct = productByName.get('Running Shoes');
  const sportsSocksProduct = productByName.get('Sports Socks');

  const orders = [];

  for (let index = 0; index < orderCount; index += 1) {
    const customer = customers[index % customers.length];
    const orderDate = makeDateRange(random, 540, 30);

    const basket = [];
    const baseProduct = choosePrimaryProduct(customer.__profile, products, random);
    basket.push(baseProduct);

    const mayAddCrossSell = customer.__profile.affinityCustomer && baseProduct.name === 'Running Shoes' && random() < 0.82;
    if (mayAddCrossSell && sportsSocksProduct) {
      basket.push(sportsSocksProduct);
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
      amount,
      source: 'historical',
      status: 'completed',
      razorpayOrderId: undefined,
      razorpayPaymentId: undefined,
      createdAt: orderDate,
    });
  }

  // Add a strong planted relationship without storing any explicit relationship field.
  const affinityCustomers = customers.filter((customer) => customer.__profile.affinityCustomer);
  const crossSellCustomerCount = Math.max(1, Math.floor(affinityCustomers.length * 0.8));

  for (let i = 0; i < crossSellCustomerCount; i += 1) {
    const customer = affinityCustomers[i];
    const orderDate = makeDateRange(random, 400, 10);
    const basket = [runningShoesProduct, sportsSocksProduct];
    const amount = basket.reduce((total, product) => total + product.price, 0);

    orders.push({
      customerId: customer._id,
      productIds: basket.map((product) => product._id),
      amount,
      source: 'historical',
      status: 'completed',
      razorpayOrderId: undefined,
      razorpayPaymentId: undefined,
      createdAt: orderDate,
    });
  }

  return orders.slice(0, orderCount + crossSellCustomerCount);
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

  const runningShoes = productLookup.get('Running Shoes');
  const sportsSocks = productLookup.get('Sports Socks');
  const crossSellOrders = createdOrders.filter((order) => {
    const hasRunningShoes = order.productIds.some((productId) => productId.toString() === runningShoes._id.toString());
    const hasSportsSocks = order.productIds.some((productId) => productId.toString() === sportsSocks._id.toString());
    return hasRunningShoes && hasSportsSocks;
  }).length;

  console.log('Seeded simulated merchant data');
  console.log(`Customers: ${createdCustomers.length}`);
  console.log(`Products: ${createdProducts.length}`);
  console.log(`Historical orders: ${createdOrders.length}`);
  console.log(`Cross-sell orders with Running Shoes + Sports Socks: ${crossSellOrders}`);
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
