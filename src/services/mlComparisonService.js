// src/services/mlComparisonService.js
const axios = require('axios');

const ML_MODELS = {
  logistic: 'https://logistic-service-djty.onrender.com/predict',      // Logistic Regression
  randomforest: 'https://randomforest-service.onrender.com/predict',  // Random Forest
  xgboost: 'https://xgboost-service-ddal.onrender.com/predict',        // XGBoost (Best)
  svm: 'https://svm-service.onrender.com/predict'            // SVM
};

let bestModel = 'xgboost';
let modelPerformance = {
  xgboost: 0.99,
  randomforest: 0.98,
  logistic: 0.95,
  svm: 0.94
};

const getBestModelPrediction = async (patientData) => {
  try {
    const response = await axios.post(ML_MODELS[bestModel], patientData);
    return {
      model: bestModel.toUpperCase(),
      ...response.data,
      modelAccuracy: modelPerformance[bestModel]
    };
  } catch (error) {
    throw new Error('Best model service unavailable');
  }
};

const compareAllModels = async (patientData) => {
  const results = [];
  for (const [name, url] of Object.entries(ML_MODELS)) {
    try {
      const res = await axios.post(url, patientData);
      results.push({
        model: name.charAt(0).toUpperCase() + name.slice(1),
        prediction: res.data.prediction,
        probability: res.data.probability,
        accuracy: modelPerformance[name] || 0
      });
    } catch (err) {
      results.push({ model: name, error: "Service down" });
    }
  }
  return results.sort((a, b) => b.accuracy - a.accuracy);
};

module.exports = { getBestModelPrediction, compareAllModels };