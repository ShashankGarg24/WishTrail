// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  res.status(404).json({
    success: false,
    message: error.message
  });
};

module.exports = notFoundHandler; 