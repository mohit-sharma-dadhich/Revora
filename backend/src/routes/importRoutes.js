const express = require('express');
const multer = require('multer');
const { importData, MAX_FILE_SIZE } = require('../controllers/importController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith('.csv')) {
      cb(new Error('Only CSV files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

router.post(
  '/data/import',
  upload.fields([
    { name: 'customers', maxCount: 1 },
    { name: 'products', maxCount: 1 },
    { name: 'orders', maxCount: 1 },
  ]),
  importData
);

module.exports = router;
