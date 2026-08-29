const { importMerchantData, MIN_FILE_SIZE, MAX_FILE_SIZE } = require('../services/import/importService');

async function importData(req, res) {
  try {
    if (!req.files || !req.files.customers || !req.files.products || !req.files.orders) {
      return res.status(400).json({
        success: false,
        error: 'All three CSV files (customers, products, orders) are required.',
      });
    }

    const result = await importMerchantData({
      customerFile: req.files.customers,
      productFile: req.files.products,
      orderFile: req.files.orders,
      auth: req.auth,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const statusCode = error.message.includes('validation failed') || error.message.includes('is required') ? 400 : 500;

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
