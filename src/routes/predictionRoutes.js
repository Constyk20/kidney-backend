// src/routes/predictionRoutes.js
const express = require('express');
const { predictCKD, compareModels } = require('../controllers/predictionController');

const router = express.Router();

router.post('/single', predictCKD);
router.post('/compare', compareModels);  // For demo/report purpose

module.exports = router;