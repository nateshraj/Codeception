const express = require('express');
const router = express.Router();
const codeController = require('../controllers/code');
const isAuth = require('../middleware/is-auth');

router.get('/', codeController.getIndex);

router.get('/problems', isAuth, codeController.getProblemList);

router.get('/problem/:problemId', isAuth, codeController.getProblem);

//To add authentication below
router.get('/add-problem', codeController.getAddProblem);

//To add validations below
router.post('/add-problem', codeController.postAddProblem);

//To add validations below
router.post('/run-code', codeController.postRunCode);

//To add validations below
router.post('/submit-code', codeController.postSubmitCode);

router.get('/profile', isAuth, codeController.getProfile);

router.get('/leaderboard', isAuth, codeController.getLeaderboard);

module.exports = router;