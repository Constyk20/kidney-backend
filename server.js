// server.js - After your existing routes
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const predictionRoutes = require('./src/routes/predictionRoutes');
const { getBestModelPrediction, compareAllModels } = require('./src/services/mlComparisonService');
const PatientRecord = require('./src/models/PatientRecord');

const app = express();

// Security & Logging
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
connectDB();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: "CKD Prediction API - Early Detection System",
    version: "1.0.0",
    endpoints: {
      base: '/',
      models: '/:model/predict',
      single: '/api/predict/single',
      compare: '/api/predict/compare'
    },
    models: ['xgboost', 'randomforest', 'svm', 'logistic', 'neuralnetwork'],
    objectives: [
      "Compare multiple ML algorithms",
      "Select best performing model",
      "Provide early-stage CKD prediction"
    ]
  });
});

// ADD THESE NEW ROUTES for your Flutter app
app.post('/:model/predict', async (req, res) => {
  try {
    const model = req.params.model;
    const patientData = req.body;
    
    // Validate model
    const validModels = ['xgboost', 'randomforest', 'svm', 'logistic', 'neuralnetwork'];
    if (!validModels.includes(model)) {
      return res.status(400).json({
        success: false,
        message: `Invalid model. Choose from: ${validModels.join(', ')}`
      });
    }

    // Map model names to your external services
    const modelServiceMap = {
      logistic: 'https://logistic-service-djty.onrender.com/predict',
      randomforest: 'https://randomforest-service.onrender.com/predict',
      xgboost: 'https://xgboost-service-ddal.onrender.com/predict',
      svm: 'https://svm-service.onrender.com/predict',
      // Note: neuralnetwork service URL might need to be added
      neuralnetwork: 'https://neuralnetwork-service.onrender.com/predict' // You'll need to create this
    };

    let result;
    let modelAccuracy;
    
    // Use the appropriate model service
    if (modelServiceMap[model]) {
      // For existing external services
      const axios = require('axios');
      const serviceResponse = await axios.post(modelServiceMap[model], patientData);
      result = {
        prediction: serviceResponse.data.prediction || 'Unknown',
        probability: serviceResponse.data.probability || 0,
        confidence: serviceResponse.data.confidence || 0
      };
    } else {
      // For neuralnetwork or fallback - use best model
      const bestModelResult = await getBestModelPrediction(patientData);
      result = {
        prediction: bestModelResult.prediction,
        probability: bestModelResult.probability,
        confidence: bestModelResult.probability * 100
      };
    }

    // Set model accuracy
    const modelPerformance = {
      xgboost: 0.99,
      randomforest: 0.98,
      logistic: 0.95,
      svm: 0.94,
      neuralnetwork: 0.96
    };
    modelAccuracy = modelPerformance[model] || 0.90;

    // Save to database
    const record = new PatientRecord({
      ...patientData,
      predictedBy: model.toUpperCase(),
      prediction: result.prediction,
      probability: result.probability,
      accuracyOfModel: modelAccuracy
    });
    await record.save();

    // Prepare response in Flutter app format
    const riskScore = result.probability * 100;
    const riskResult = result.prediction === "CKD" ? "HIGH RISK: CKD Detected" : "LOW RISK: No CKD";

    res.json({
      success: true,
      risk_score: riskScore,
      result: riskResult,
      confidence: result.confidence || riskScore.toFixed(1),
      model: model,
      accuracy: (modelAccuracy * 100).toFixed(1),
      patientRecordId: record._id,
      recommendation: result.prediction === "CKD"
        ? "High risk detected. Consult nephrologist immediately."
        : "Low risk. Continue annual checkups."
    });

  } catch (error) {
    console.error(`Error in ${req.params.model}/predict:`, error.message);
    res.status(500).json({
      success: false,
      message: "Prediction failed",
      error: error.message,
      suggestion: "Try using a different model or check your input data"
    });
  }
});

// Use existing routes
app.use('/api/predict', predictionRoutes);

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: {
      'GET /': 'API documentation',
      'POST /:model/predict': 'Get prediction from specific model',
      'POST /api/predict/single': 'Get prediction from best model',
      'POST /api/predict/compare': 'Compare all models'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  / - API documentation`);
  console.log(`  POST /:model/predict - Specific model prediction`);
  console.log(`  POST /api/predict/single - Best model prediction`);
  console.log(`  POST /api/predict/compare - Compare all models`);
  console.log(`\nSupported models: xgboost, randomforest, svm, logistic, neuralnetwork`);
});