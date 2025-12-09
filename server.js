// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const predictionRoutes = require('./src/routes/predictionRoutes');

const app = express();

// Security & Logging
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
connectDB();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: "CKD Prediction API - Early Detection System",
    version: "1.0.0",
    objectives: [
      "Compare multiple ML algorithms",
      "Select best performing model",
      "Provide early-stage CKD prediction"
    ]
  });
});

app.use('/api/predict', predictionRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});