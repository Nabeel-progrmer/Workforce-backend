const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate value already exists"
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(err.errors).map(
        (error) => error.message
      )
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID"
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error"
  });
};

module.exports = errorMiddleware;