const express = require('express');
const router = express.Router();
const attributionController = require('../controllers/attribution');

/**
 * Attribution tracking and management endpoints
 */

/**
 * POST /api/v1/attribution/track
 * Track a new attribution event
 */
router.post('/track', attributionController.trackEvent);

/**
 * GET /api/v1/attribution/events
 * Get all attribution events with pagination
 */
router.get('/events', attributionController.getEvents);

/**
 * GET /api/v1/attribution/events/:id
 * Get a specific attribution event by ID
 */
router.get('/events/:id', attributionController.getEventById);

/**
 * PUT /api/v1/attribution/events/:id
 * Update an attribution event
 */
router.put('/events/:id', attributionController.updateEvent);

/**
 * DELETE /api/v1/attribution/events/:id
 * Delete an attribution event
 */
router.delete('/events/:id', attributionController.deleteEvent);

/**
 * GET /api/v1/attribution/stats
 * Get attribution statistics
 */
router.get('/stats', attributionController.getStats);

module.exports = router;
