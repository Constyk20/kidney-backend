// src/controllers/predictionController.js
const PatientRecord = require('../models/PatientRecord');
const { getBestModelPrediction, compareAllModels } = require('../services/mlComparisonService');

exports.predictCKD = async (req, res) => {
  try {
    const patientData = req.body;

    // Get prediction from best model
    const result = await getBestModelPrediction(patientData);

    // Save to database
    const record = new PatientRecord({
      ...patientData,
      predictedBy: result.model,
      prediction: result.prediction,
      probability: result.probability,
      accuracyOfModel: result.modelAccuracy
    });
    await record.save();

    res.json({
      success: true,
      message: "Early-stage CKD prediction completed",
      data: {
        riskLevel: result.prediction,
        confidence: result.probability + "%",
        modelUsed: result.model,
        modelAccuracy: (result.modelAccuracy * 100).toFixed(2) + "%",
        recommendation: result.prediction === "CKD"
          ? "High risk detected. Consult nephrologist immediately."
          : "Low risk. Continue annual checkups.",
        patientRecordId: record._id
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Prediction failed",
      error: error.message
    });
  }
};

exports.compareModels = async (req, res) => {
  try {
    const comparison = await compareAllModels(req.body);
    res.json({
      success: true,
      comparisonTable: comparison,
      bestModel: comparison[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};