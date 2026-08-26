const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const { getProductAffinity, MIN_BASE_CUSTOMERS } = require('./src/services/analytics/productAffinity');

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/revora');
  const products = await Product.find({}).lean();
  const productByName = new Map(products.map((product) => [product.name, product._id.toString()]));
  const results = await getProductAffinity({ minBaseCustomers: MIN_BASE_CUSTOMERS });
  const runningShoesId = productByName.get('Running Shoes');
  const sportsSocksId = productByName.get('Sports Socks');
  const pair = results.find((row) => row.baseProductId === runningShoesId && row.relatedProductId === sportsSocksId)
    || results.find((row) => row.baseProductId === sportsSocksId && row.relatedProductId === runningShoesId);
  const topFive = results.slice(0, 5);
  console.log(JSON.stringify({
    totalResults: results.length,
    minBaseCustomers: MIN_BASE_CUSTOMERS,
    runningShoesId,
    sportsSocksId,
    pair,
    topFive,
  }, null, 2));
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
