export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal server error',
      details: err.details || [],
    },
  };

  // Set appropriate status code
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json(errorResponse);
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
};
