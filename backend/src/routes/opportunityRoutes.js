const express = require('express');
const { getOpportunity } = require('../controllers/opportunityController');

const router = express.Router();

router.get('/opportunities', getOpportunity);

module.exports = router;
