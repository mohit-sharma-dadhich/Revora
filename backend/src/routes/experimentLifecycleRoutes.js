const express = require('express');
const {
	getExperiment,
	getCompletedExperiments,
	startExperiment,
	analyzeExperiment,
	scaleExperiment,
	endExperiment,
} = require('../controllers/experimentLifecycleController');

const router = express.Router();

router.get('/experiments/history', getCompletedExperiments);
router.get('/experiments/:id', getExperiment);
router.post('/experiments/:id/start', startExperiment);
router.post('/experiments/:id/analyze', analyzeExperiment);
router.post('/experiments/:id/scale', scaleExperiment);
router.post('/experiments/:id/end', endExperiment);

module.exports = router;
