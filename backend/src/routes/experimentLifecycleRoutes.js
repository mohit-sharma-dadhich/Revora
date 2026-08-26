const express = require('express');
const { getExperiment, startExperiment, completeExperiment } = require('../controllers/experimentLifecycleController');

const router = express.Router();

router.get('/experiments/:id', getExperiment);
router.post('/experiments/:id/start', startExperiment);
router.post('/experiments/:id/complete', completeExperiment);

module.exports = router;
