require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const errorHandler = require('./middleware/errorHandler');
const attributionRoutes = require('./routes/attribution');
const healthRoutes = require('./routes/health');
const linksRoutes = require('./routes/links');
const linksController = require('./controllers/links');

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: false
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';

app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/attribution`, attributionRoutes);
// Short link creation endpoint (POST /links)
app.use('/links', linksRoutes);

// Redirect endpoint (GET /r/:shortCode)
app.get('/r/:shortCode', linksController.handleRedirect);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
