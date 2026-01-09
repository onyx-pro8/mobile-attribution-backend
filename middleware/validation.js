/**
 * Request Validation Middleware
 * Validates required fields in request body
 */
const validateRequest = (requiredFields = []) => {
  return (req, res, next) => {
    const errors = [];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
};

module.exports = validateRequest;
