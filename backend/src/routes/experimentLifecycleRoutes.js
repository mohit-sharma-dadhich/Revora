const express = require('express');
const {
	getExperiment,
	startExperiment,
	completeExperiment,
	analyzeExperiment,
	scaleExperiment,
	endExperiment,
} = require('../controllers/experimentLifecycleController');

const router = express.Router();

router.get('/experiments/:id', getExperiment);
router.post('/experiments/:id/start', startExperiment);
router.post('/experiments/:id/complete', completeExperiment);
router.post('/experiments/:id/analyze', analyzeExperiment);
router.post('/experiments/:id/scale', scaleExperiment);
router.post('/experiments/:id/end', endExperiment);

module.exports = router;
