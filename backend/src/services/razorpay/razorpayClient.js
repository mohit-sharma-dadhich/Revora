const Razorpay = require('razorpay');

function assertEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function createRazorpayClient() {
  const keyId = assertEnvironmentVariable('RAZORPAY_KEY_ID');
  const keySecret = assertEnvironmentVariable('RAZORPAY_KEY_SECRET');

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

module.exports = {
  createRazorpayClient,
};
