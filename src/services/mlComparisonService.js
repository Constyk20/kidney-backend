// src/services/mlComparisonService.js
const axios = require('axios');

const ML_MODELS = {
  logistic: 'https://logistic-service-djty.onrender.com/predict',      // Logistic Regression
  randomforest: 'https://randomforest-service.onrender.com/predict',  // Random Forest
  xgboost: 'https://xgboost-service-ddal.onrender.com/predict',        // XGBoost (Best)
  svm: 'https://svm-service.onrender.com/predict',                     // SVM
  neuralnetwork: 'https://neuralnetwork-service.onrender.com/predict'  // Neural Network
};

let bestModel = 'xgboost';
let modelPerformance = {
  xgboost: 0.99,
  randomforest: 0.98,
  logistic: 0.95,
  svm: 0.94,
  neuralnetwork: 0.96  
};

const getBestModelPrediction = async (patientData) => {
  try {
    const response = await axios.post(ML_MODELS[bestModel], patientData);
    return {
      model: bestModel.toUpperCase(),
      prediction: response.data.prediction || 'Unknown',
      probability: response.data.probability || 0,
      confidence: response.data.confidence || 0,
      modelAccuracy: modelPerformance[bestModel]
    };
  } catch (error) {
    // Fallback to another model if best fails
    console.error('Best model failed, trying alternatives...');
    
    // Try models in order of performance
    const fallbackModels = Object.keys(modelPerformance)
      .sort((a, b) => modelPerformance[b] - modelPerformance[a]);
    
    for (const model of fallbackModels) {
      if (model === bestModel) continue;
      
      try {
        const response = await axios.post(ML_MODELS[model], patientData);
        return {
          model: model.toUpperCase(),
          prediction: response.data.prediction || 'Unknown',
          probability: response.data.probability || 0,
          confidence: response.data.confidence || 0,
          modelAccuracy: modelPerformance[model],
          fallback: true
        };
      } catch (err) {
        console.error(`${model} also failed:`, err.message);
      }
    }
    
    throw new Error('All model services unavailable');
  }
};

const compareAllModels = async (patientData) => {
  const results = [];
  const promises = Object.entries(ML_MODELS).map(async ([name, url]) => {
    try {
      const res = await axios.post(url, patientData);
      return {
        model: name.charAt(0).toUpperCase() + name.slice(1),
        prediction: res.data.prediction || 'Unknown',
        probability: res.data.probability || 0,
        accuracy: modelPerformance[name] || 0,
        status: 'success'
      };
    } catch (err) {
      return {
        model: name.charAt(0).toUpperCase() + name.slice(1),
        error: "Service down",
        accuracy: modelPerformance[name] || 0,
        status: 'failed'
      };
    }
  });
  
  const settledResults = await Promise.allSettled(promises);
  settledResults.forEach(result => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    }
  });
  
  return results.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
};

module.exports = { getBestModelPrediction, compareAllModels };