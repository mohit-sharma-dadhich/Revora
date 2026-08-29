const express = require('express');
const {
  getOpportunity,
  listOpportunitiesHandler,
  getRecommendation,
} = require('../controllers/opportunityController');

const router = express.Router();

router.get('/opportunities', getOpportunity);
router.get('/opportunities/list', listOpportunitiesHandler);
router.post('/opportunities/recommend', getRecommendation);

module.exports = router;
