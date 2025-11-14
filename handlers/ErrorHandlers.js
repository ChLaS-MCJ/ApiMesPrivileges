/**
 * Error Handlers
 */

/**
 * Wraps a function with error handling logic.
 * @param {function} fn - The function to be wrapped.
 * @returns {function} - The wrapped function.
 */
exports.catchErrors = (fn) => (req, res, next) => {
  const resp = fn(req, res, next);
  return resp instanceof Promise ? resp.catch(next) : resp;
};

/**
 * Handles 404 errors.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {function} next - The next middleware function.
 */
exports.notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: "The API URL does not exist",
  });
};

/**
 * Handles development errors.
 * @param {Error} error - The error object.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {function} next - The next middleware function.
 */
exports.developmentErrors = (error, req, res, next) => {
  error.stack = error.stack || '';
  const errorDetails = {
    message: error.message,
    status: error.status,
    stackHighlighted: error.stack.replace(/[a-z_-\d]+.js:\d+:\d+/gi, '<mark>$&</mark>'),
  };

  res.status(500).json({
    success: false,
    message: error.message,
    error: errorDetails,
  });
};

/**
 * Handles production errors.
 * @param {Error} error - The error object.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @param {function} next - The next middleware function.
 */
exports.productionErrors = (error, req, res, next) => {
  res.status(500).json({
    success: false,
    message: error.message,
    error: error,
  });
};
