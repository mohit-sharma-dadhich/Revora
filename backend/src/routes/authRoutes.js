const express = require('express');
const { createTest, signIn, signUp, currentUser } = require('../controllers/authController');
const { attachAuth } = require('../middleware/auth');

const router = express.Router();
router.post('/auth/test-session', createTest);
router.post('/auth/signup', signUp);
router.post('/auth/signin', signIn);
router.get('/auth/me', attachAuth, currentUser);

module.exports = router;
