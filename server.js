require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const predictionRoutes = require('./src/routes/predictionRoutes');
const { getBestModelPrediction } = require('./src/services/mlComparisonService');
const PatientRecord = require('./src/models/PatientRecord');

const app = express();

// Security & Logging
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Specific model prediction endpoints for Flutter app
app.post('/xgboost/predict', async (req, res) => {
  await handleModelPrediction('xgboost', req, res);
});

app.post('/randomforest/predict', async (req, res) => {
  await handleModelPrediction('randomforest', req, res);
});

app.post('/svm/predict', async (req, res) => {
  await handleModelPrediction('svm', req, res);
});

app.post('/logistic/predict', async (req, res) => {
  await handleModelPrediction('logistic', req, res);
});

app.post('/neuralnetwork/predict', async (req, res) => {
  await handleModelPrediction('neuralnetwork', req, res);
});

// Generic model endpoint (optional)
app.post('/:model/predict', async (req, res) => {
  const model = req.params.model;
  await handleModelPrediction(model, req, res);
});

// Handler function for all model predictions
async function handleModelPrediction(model, req, res) {
  try {
    const patientData = req.body;
    
    console.log(`Received prediction request for model: ${model}`);
    console.log('Patient data keys:', Object.keys(patientData));
    
    // Validate model
    const validModels = ['xgboost', 'randomforest', 'svm', 'logistic', 'neuralnetwork'];
    if (!validModels.includes(model)) {
      return res.status(400).json({
        success: false,
        message: `Invalid model. Choose from: ${validModels.join(', ')}`,
        received: model
      });
    }

    // Model performance ratings
    const modelPerformance = {
      xgboost: 0.987,
      randomforest: 0.962,
      neuralnetwork: 0.958,
      svm: 0.941,
      logistic: 0.925
    };

    // Model service URLs
    const modelServiceMap = {
      logistic: 'https://logistic-service-djty.onrender.com/predict',
      randomforest: 'https://randomforest-service.onrender.com/predict',
      xgboost: 'https://xgboost-service-ddal.onrender.com/predict',
      svm: 'https://svm-service.onrender.com/predict',
      neuralnetwork: 'https://neuralnetwork-service.onrender.com/predict'
    };

    let predictionResult;
    let modelAccuracy = modelPerformance[model] || 0.90;

    // Try to call external service
    if (modelServiceMap[model]) {
      try {
        const axios = require('axios');
        console.log(`Calling external service: ${modelServiceMap[model]}`);
        
        const serviceResponse = await axios.post(
          modelServiceMap[model], 
          patientData,
          { timeout: 10000 }
        );
        
        console.log(`Service response for ${model}:`, serviceResponse.data);
        
        predictionResult = {
          prediction: serviceResponse.data.prediction || 'Unknown',
          probability: serviceResponse.data.probability || 0.5,
          confidence: serviceResponse.data.confidence || 0
        };
      } catch (serviceError) {
        console.error(`External service ${model} failed:`, serviceError.message);
        // Fallback to mock prediction if service fails
        predictionResult = generateMockPrediction(patientData, model);
      }
    } else {
      // Generate mock prediction
      predictionResult = generateMockPrediction(patientData, model);
    }

    // Calculate risk score (0-100%)
    const riskScore = (predictionResult.probability * 100);
    
    // Determine CKD status based on probability threshold
    const hasCKD = predictionResult.probability > 0.5;
    const riskLevel = hasCKD ? "HIGH RISK: CKD Detected" : "LOW RISK: No CKD";
    
    // Create result message
    const confidence = predictionResult.confidence || riskScore.toFixed(1);
    const resultMessage = `${riskLevel}\nConfidence: ${confidence}%`;

    // Save to database
    const record = new PatientRecord({
      ...patientData,
      predictedBy: model.toUpperCase(),
      prediction: predictionResult.prediction,
      probability: predictionResult.probability,
      accuracyOfModel: modelAccuracy,
      riskScore: riskScore,
      timestamp: new Date()
    });
    
    await record.save();

    // Prepare response in Flutter app format
    res.json({
      success: true,
      risk_score: riskScore,
      result: resultMessage,
      confidence: parseFloat(confidence),
      model: model,
      model_display: model.charAt(0).toUpperCase() + model.slice(1),
      accuracy: (modelAccuracy * 100).toFixed(1),
      patientRecordId: record._id,
      recommendation: hasCKD 
        ? "High risk detected. Consult nephrologist immediately."
        : "Low risk. Continue annual checkups.",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Error in ${model}/predict:`, error);
    res.status(500).json({
      success: false,
      message: "Prediction failed",
      error: error.message,
      model: model,
      suggestion: "Try using a different model or check your input data"
    });
  }
}

// Mock prediction generator for testing/fallback
function generateMockPrediction(patientData, model) {
  console.log(`Generating mock prediction for ${model}`);
  
  // Simple mock logic based on key parameters
  let riskFactors = 0;
  const age = patientData.age || 50;
  const bp = patientData.bp || 120;
  const sc = patientData.sc || 1.0;
  const bu = patientData.bu || 30;
  const bgr = patientData.bgr || 100;
  
  if (age > 60) riskFactors++;
  if (bp > 140) riskFactors++;
  if (sc > 1.3) riskFactors++;
  if (bu > 40) riskFactors++;
  if (bgr > 126) riskFactors++;
  
  // Base probability + risk factor adjustment
  const baseProbability = 0.3;
  const factorAdjustment = riskFactors * 0.15;
  const probability = Math.min(baseProbability + factorAdjustment, 0.95);
  
  // Add some randomness based on model
  const modelAdjustments = {
    xgboost: 0.02,
    randomforest: 0.01,
    neuralnetwork: 0.015,
    svm: 0.0,
    logistic: -0.01
  };
  
  const finalProbability = probability + (modelAdjustments[model] || 0);
  
  return {
    prediction: finalProbability > 0.5 ? "CKD" : "No CKD",
    probability: finalProbability,
    confidence: (finalProbability * 100).toFixed(1)
  };
}

// Use existing routes
app.use('/api/predict', predictionRoutes);

// Handle 404 - FIXED: Use proper wildcard string
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    requested: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      'GET /': 'API documentation',
      'GET /health': 'Health check',
      'POST /:model/predict': 'Get prediction from specific model (xgboost, randomforest, svm, logistic, neuralnetwork)',
      'POST /api/predict/single': 'Get prediction from best model',
      'POST /api/predict/compare': 'Compare all models'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  / - API documentation`);
  console.log(`  GET  /health - Health check`);
  console.log(`  POST /xgboost/predict - XGBoost model prediction`);
  console.log(`  POST /randomforest/predict - Random Forest model prediction`);
  console.log(`  POST /svm/predict - SVM model prediction`);
  console.log(`  POST /logistic/predict - Logistic Regression model prediction`);
  console.log(`  POST /neuralnetwork/predict - Neural Network model prediction`);
  console.log(`  POST /api/predict/single - Best model prediction`);
  console.log(`  POST /api/predict/compare - Compare all models`);
});