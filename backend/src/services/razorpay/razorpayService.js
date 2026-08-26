const { createRazorpayClient } = require('./razorpayClient');

function validateMoneyInput(amount, currency) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('amount must be a positive integer in paise');
  }

  if (!currency || typeof currency !== 'string' || !currency.trim()) {
    throw new Error('currency is required');
  }

  const normalizedCurrency = currency.trim().toUpperCase();

  if (normalizedCurrency !== 'INR') {
    throw new Error('currency must be INR for Razorpay Test Mode usage in this MVP');
  }

  return normalizedCurrency;
}

function createRazorpayService() {
  const razorpay = createRazorpayClient();

  return {
    async createTestOrder({ amount, currency = 'INR', receipt, notes, payment_capture = 1 }) {
      const normalizedCurrency = validateMoneyInput(amount, currency);

      if (!receipt || typeof receipt !== 'string' || !receipt.trim()) {
        throw new Error('receipt is required');
      }

      const payload = {
        amount,
        currency: normalizedCurrency,
        receipt: receipt.trim(),
        payment_capture,
      };

      if (notes && typeof notes === 'object') {
        payload.notes = notes;
      }

      return razorpay.orders.create(payload);
    },

    async fetchOrder(orderId) {
      if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
        throw new Error('orderId is required');
      }

      return razorpay.orders.fetch(orderId.trim());
    },

    async fetchPayment(paymentId) {
      if (!paymentId || typeof paymentId !== 'string' || !paymentId.trim()) {
        throw new Error('paymentId is required');
      }

      return razorpay.payments.fetch(paymentId.trim());
    },
  };
}

module.exports = {
  createRazorpayService,
  validateMoneyInput,
};
