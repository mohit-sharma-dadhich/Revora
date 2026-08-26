const express = require('express');
const { getExperiment, startExperiment } = require('../controllers/experimentLifecycleController');

const router = express.Router();

router.get('/experiments/:id', getExperiment);
router.post('/experiments/:id/start', startExperiment);

module.exports = router;
