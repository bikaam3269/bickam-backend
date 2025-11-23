/**
 * Standardized API Response Helper
 * All API responses follow this format:
 * {
 *   statusCode: number (HTTP status code),
 *   message: string,
 *   data: any
 * }
 */

export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    statusCode,
    message,
    data
  });
};

export const sendError = (res, message = 'An error occurred', statusCode = 400, data = null) => {
  return res.status(statusCode).json({
    statusCode,
    message,
    data
  });
};

