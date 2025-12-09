
const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  age: Number,
  bp: Number,
  sg: Number,
  al: Number,
  su: Number,
  bgr: Number,
  bu: Number,
  sc: Number,
  sod: Number,
  pot: Number,
  hemo: Number,
  pcv: Number,
  wbcc: Number,
  rbcc: Number,
  htn: String,
  dm: String,
  cad: String,
  appet: String,
  pe: String,
  ane: String,
  rbc: String,
  pc: String,
  pcc: String,
  ba: String,

  // Prediction results
  predictedBy: String,           // e.g., "XGBoost", "RandomForest"
  prediction: String,            // "CKD" or "Not CKD"
  probability: Number,
  accuracyOfModel: Number,       // Stored from comparison
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PatientRecord', patientSchema);