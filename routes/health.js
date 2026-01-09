const express = require('express');
const router = express.Router();
const attributionController = require('../controllers/attribution');

/**
 * Health check endpoints
 */

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /api/v1/health/ready
 * Readiness check endpoint
 */
router.get('/ready', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/health/live
 * Liveness check endpoint
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
