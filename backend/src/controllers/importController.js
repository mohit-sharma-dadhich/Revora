const { importMerchantData, MIN_FILE_SIZE, MAX_FILE_SIZE } = require('../services/import/importService');

async function importData(req, res) {
  try {
    if (!req.files || !req.files.customers?.[0] || !req.files.products?.[0] || !req.files.orders?.[0]) {
      return res.status(400).json({
        success: false,
        error: 'All three CSV files (customers, products, orders) are required.',
      });
    }

    const result = await importMerchantData({
      customerFile: req.files.customers[0],
      productFile: req.files.products[0],
      orderFile: req.files.orders[0],
      auth: req.auth,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const statusCode = [
      'validation failed',
      'is required',
      'is too small',
      'too large',
      'is invalid',
    ].some((token) => error.message.includes(token)) ? 400 : 500;

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  importData,
  MIN_FILE_SIZE,
  MAX_FILE_SIZE,
};
