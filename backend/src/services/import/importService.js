const fs = require('fs');
const { parse } = require('csv-parse');
const mongoose = require('mongoose');

const Customer = require('../../models/Customer');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const AuditLog = require('../../models/AuditLog');

const MIN_FILE_SIZE = 1 * 1024; // 1 KB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function validateFileSize(fileBuffer) {
  const sizeInKB = fileBuffer.length / 1024;
  if (sizeInKB < MIN_FILE_SIZE / 1024) {
    throw new Error(`File is too small. Minimum size is ${MIN_FILE_SIZE / 1024} KB.`);
  }
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`);
  }
}

function validateEmail(email) {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
}

function validatePrice(price) {
  const priceNum = Number(price);
  return Number.isInteger(priceNum) && priceNum >= 0;
}

async function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    parser.on('readable', function () {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', (error) => {
      reject(new Error(`CSV parsing error: ${error.message}`));
    });

    parser.on('end', () => {
      resolve(records);
    });

    parser.write(buffer);
    parser.end();
  });
}

async function validateCustomersCSV(records) {
  if (!records || records.length === 0) {
    throw new Error('Customers CSV is empty.');
  }

  const errors = [];
  const externalIds = new Set();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // +1 for header, +1 for 1-indexed

    if (!row.externalId || !row.externalId.trim()) {
      errors.push(`Row ${rowNum}: externalId is required.`);
      continue;
    }

    if (externalIds.has(row.externalId)) {
      errors.push(`Row ${rowNum}: externalId "${row.externalId}" is duplicated.`);
      continue;
    }

    externalIds.add(row.externalId);

    if (!row.name || !row.name.trim()) {
      errors.push(`Row ${rowNum}: name is required.`);
    }

    if (!row.email || !row.email.trim()) {
      errors.push(`Row ${rowNum}: email is required.`);
    } else if (!validateEmail(row.email)) {
      errors.push(`Row ${rowNum}: email "${row.email}" is invalid.`);
    }

    if (!row.segment || !row.segment.trim()) {
      errors.push(`Row ${rowNum}: segment is required.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Customers CSV validation failed:\n${errors.join('\n')}`);
  }

  return externalIds;
}

async function validateProductsCSV(records) {
  if (!records || records.length === 0) {
    throw new Error('Products CSV is empty.');
  }

  const errors = [];
  const externalIds = new Set();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2;

    if (!row.externalId || !row.externalId.trim()) {
      errors.push(`Row ${rowNum}: externalId is required.`);
      continue;
    }

    if (externalIds.has(row.externalId)) {
      errors.push(`Row ${rowNum}: externalId "${row.externalId}" is duplicated.`);
      continue;
    }

    externalIds.add(row.externalId);

    if (!row.name || !row.name.trim()) {
      errors.push(`Row ${rowNum}: name is required.`);
    }

    if (!row.category || !row.category.trim()) {
      errors.push(`Row ${rowNum}: category is required.`);
    }

    if (!row.price || row.price === '') {
      errors.push(`Row ${rowNum}: price is required.`);
    } else if (!validatePrice(row.price)) {
      errors.push(`Row ${rowNum}: price must be a non-negative integer.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Products CSV validation failed:\n${errors.join('\n')}`);
  }

  return externalIds;
}

async function validateOrdersCSV(records, customerExternalIds, productExternalIds) {
  if (!records || records.length === 0) {
    throw new Error('Orders CSV is empty.');
  }

  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2;

    if (!row.externalId || !row.externalId.trim()) {
      errors.push(`Row ${rowNum}: externalId is required.`);
      continue;
    }

    if (!row.customerExternalId || !row.customerExternalId.trim()) {
      errors.push(`Row ${rowNum}: customerExternalId is required.`);
    } else if (!customerExternalIds.has(row.customerExternalId)) {
      errors.push(`Row ${rowNum}: customerExternalId "${row.customerExternalId}" does not exist.`);
    }

    if (!row.productExternalIds || !row.productExternalIds.trim()) {
      errors.push(`Row ${rowNum}: productExternalIds is required.`);
    } else {
      const productIds = row.productExternalIds.split('|').map((id) => id.trim());
      for (const productId of productIds) {
        if (!productExternalIds.has(productId)) {
          errors.push(`Row ${rowNum}: productExternalId "${productId}" does not exist.`);
        }
      }
    }

    if (!row.amount || row.amount === '') {
      errors.push(`Row ${rowNum}: amount is required.`);
    } else if (!validatePrice(row.amount)) {
      errors.push(`Row ${rowNum}: amount must be a non-negative integer.`);
    }

    if (!row.status || !row.status.trim()) {
      errors.push(`Row ${rowNum}: status is required.`);
    } else if (!['completed', 'failed', 'pending', 'cancelled'].includes(row.status.toLowerCase())) {
      errors.push(`Row ${rowNum}: status must be one of: completed, failed, pending, cancelled.`);
    }

    if (!row.createdAt || !row.createdAt.trim()) {
      errors.push(`Row ${rowNum}: createdAt is required.`);
    } else {
      const date = new Date(row.createdAt);
      if (Number.isNaN(date.getTime())) {
        errors.push(`Row ${rowNum}: createdAt "${row.createdAt}" is not a valid date.`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Orders CSV validation failed:\n${errors.join('\n')}`);
  }
}

function ownershipFields(auth) {
  if (!auth) return {};
  return auth.mode === 'test'
    ? { sessionId: auth.sessionId, expiresAt: auth.expiresAt }
    : { ownerId: auth.user.id };
}

async function importMerchantData({ customerFile, productFile, orderFile, auth }) {
  if (!customerFile || !productFile || !orderFile) {
    throw new Error('All three CSV files (customers, products, orders) are required.');
  }

  const scope = ownershipFields(auth);

  // Validate file sizes
  validateFileSize(customerFile.buffer);
  validateFileSize(productFile.buffer);
  validateFileSize(orderFile.buffer);

  // Parse CSVs
  const customerRecords = await parseCSV(customerFile.buffer);
  const productRecords = await parseCSV(productFile.buffer);
  const orderRecords = await parseCSV(orderFile.buffer);

  // Validate structure and content
  const customerExternalIds = await validateCustomersCSV(customerRecords);
  const productExternalIds = await validateProductsCSV(productRecords);
  await validateOrdersCSV(orderRecords, customerExternalIds, productExternalIds);

  const existingCustomerEmails = new Set(
    (await Customer.find(
      { ...scope, email: { $in: customerRecords.map((row) => row.email.trim().toLowerCase()) } },
      { email: 1 }
    ).lean()).map((doc) => doc.email)
  );

  const customerMap = new Map();
  const productMap = new Map();

  const newCustomerRows = customerRecords.filter(
    (row) => !existingCustomerEmails.has(row.email.trim().toLowerCase())
  );

  const customersToInsert = newCustomerRows.map((row) => ({
    ...scope,
    name: row.name.trim(),
    email: row.email.trim().toLowerCase(),
    segment: row.segment.trim(),
    totalSpend: 0,
    orderCount: 0,
    lastPurchaseAt: null,
  }));

  const createdCustomers = customersToInsert.length > 0
    ? await Customer.insertMany(customersToInsert)
    : [];
  for (let i = 0; i < createdCustomers.length; i++) {
    customerMap.set(newCustomerRows[i].externalId, createdCustomers[i]._id);
  }

  const existingCustomers = await Customer.find(
    { ...scope, email: { $in: customerRecords.map((row) => row.email.trim().toLowerCase()) } },
    { email: 1 }
  ).lean();
  const emailToId = new Map(existingCustomers.map((doc) => [doc.email, doc._id]));
  for (const row of customerRecords) {
    if (!customerMap.has(row.externalId)) {
      const id = emailToId.get(row.email.trim().toLowerCase());
      if (id) customerMap.set(row.externalId, id);
    }
  }

  const productsToInsert = productRecords.map((row) => ({
    ...scope,
    name: row.name.trim(),
    category: row.category.trim(),
    price: Number(row.price),
  }));

  const createdProducts = await Product.insertMany(productsToInsert);
  for (let i = 0; i < createdProducts.length; i++) {
    productMap.set(productRecords[i].externalId, createdProducts[i]._id);
  }

  const ordersToInsert = orderRecords.map((row) => {
    const productIds = row.productExternalIds.split('|').map((id) => productMap.get(id.trim()));
    return {
      ...scope,
      customerId: customerMap.get(row.customerExternalId),
      productIds,
      amount: Number(row.amount),
      source: 'historical',
      status: row.status.toLowerCase(),
      createdAt: new Date(row.createdAt),
    };
  });

  const createdOrders = await Order.insertMany(ordersToInsert);

  await AuditLog.create({
    actor: 'merchant',
    action: 'DATA_IMPORT_COMPLETED',
    status: 'SUCCESS',
    reason: `Imported ${createdCustomers.length} customers (${newCustomerRows.length - createdCustomers.length} skipped as duplicates), ${createdProducts.length} products, ${createdOrders.length} orders.`,
    metadata: {
      customersCount: createdCustomers.length,
      productsCount: createdProducts.length,
      ordersCount: createdOrders.length,
    },
    ...scope,
  });

  return {
    customersImported: createdCustomers.length,
    productsImported: createdProducts.length,
    ordersImported: createdOrders.length,
    errors: [],
  };
}

module.exports = {
  importMerchantData,
  MIN_FILE_SIZE,
  MAX_FILE_SIZE,
};
