const express = require('express');
const { proposeExperiment } = require('../controllers/experimentController');

const router = express.Router();

router.post('/experiments/propose', proposeExperiment);

module.exports = router;
