/**
 * Global Error Handler Middleware
 * Catches all errors and returns JSON response
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const nodeEnv = process.env.NODE_ENV || 'development';

  console.error(`[ERROR] ${statusCode}: ${message}`, err);

  const response = {
    success: false,
    error: message,
    statusCode: statusCode,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  };

  // Include stack trace in development only
  if (nodeEnv === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
