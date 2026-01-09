/**
 * Attribution Controller
 * Handles mobile attribution tracking and data management
 */

// Simulated database (replace with real database in production)
const attributionEvents = [];

/**
 * Track attribution event
 */
const trackEvent = async (req, res, next) => {
  try {
    const { deviceId, appName, source, campaign, userId } = req.body;

    // Validate required fields
    if (!deviceId || !appName || !source) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: deviceId, appName, source'
      });
    }

    const event = {
      id: generateId(),
      deviceId,
      appName,
      source,
      campaign: campaign || null,
      userId: userId || null,
      timestamp: new Date().toISOString(),
      metadata: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    };

    attributionEvents.push(event);

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attribution statistics
 */
const getStats = async (req, res, next) => {
  try {
    const { appName, source, startDate, endDate } = req.query;

    let filtered = attributionEvents;

    if (appName) {
      filtered = filtered.filter(e => e.appName === appName);
    }

    if (source) {
      filtered = filtered.filter(e => e.source === source);
    }

    if (startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(endDate));
    }

    const stats = {
      totalEvents: filtered.length,
      uniqueDevices: new Set(filtered.map(e => e.deviceId)).size,
      sources: [...new Set(filtered.map(e => e.source))],
      apps: [...new Set(filtered.map(e => e.appName))],
      eventsBySource: filtered.reduce((acc, e) => {
        acc[e.source] = (acc[e.source] || 0) + 1;
        return acc;
      }, {})
    };

    res.status(200).json({
      success: true,
      data: stats,
      filters: {
        appName: appName || null,
        source: source || null,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all attribution events
 */
const getEvents = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const page = parseInt(offset) || 0;
    const pageSize = Math.min(parseInt(limit) || 50, 100);

    const paginatedEvents = attributionEvents.slice(page, page + pageSize);

    res.status(200).json({
      success: true,
      data: paginatedEvents,
      pagination: {
        total: attributionEvents.length,
        limit: pageSize,
        offset: page,
        hasMore: page + pageSize < attributionEvents.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single event by ID
 */
const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = attributionEvents.find(e => e.id === id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update attribution event
 */
const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventIndex = attributionEvents.findIndex(e => e.id === id);

    if (eventIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const updatedEvent = {
      ...attributionEvents[eventIndex],
      ...req.body,
      id: attributionEvents[eventIndex].id,
      timestamp: attributionEvents[eventIndex].timestamp,
      updatedAt: new Date().toISOString()
    };

    attributionEvents[eventIndex] = updatedEvent;

    res.status(200).json({
      success: true,
      data: updatedEvent,
      message: 'Event updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete attribution event
 */
const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventIndex = attributionEvents.findIndex(e => e.id === id);

    if (eventIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const deletedEvent = attributionEvents.splice(eventIndex, 1)[0];

    res.status(200).json({
      success: true,
      data: deletedEvent,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate unique ID
 */
const generateId = () => {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  trackEvent,
  getStats,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent
};
