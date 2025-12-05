export const errorHandler = (err, req, res, next) => {
  // Handle timeout errors
  if (err.name === 'SequelizeTimeoutError' || 
      err.name === 'TimeoutError' ||
      err.message?.includes('timeout') ||
      err.message?.includes('Timeout') ||
      err.code === 'ETIMEDOUT' ||
      err.code === 'ESOCKETTIMEDOUT') {
    return res.status(500).json({
      statusCode: 500,
      message: 'Operation timeout',
      data: null
    });
  }

  // Handle database connection errors
  if (err.name === 'SequelizeConnectionError' ||
      err.name === 'SequelizeConnectionRefusedError' ||
      err.name === 'SequelizeHostNotFoundError' ||
      err.name === 'SequelizeConnectionTimedOutError') {
    return res.status(503).json({
      statusCode: 503,
      message: 'Database connection error. Please try again later.',
      data: null
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    statusCode,
    message,
    data: process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};


