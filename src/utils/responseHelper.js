/**
 * Standardized API Response Helper
 * All API responses follow this format:
 * {
 *   status: boolean,
 *   message: string,
 *   data: any
 * }
 */

export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    status: true,
    message,
    data
  });
};

export const sendError = (res, message = 'An error occurred', statusCode = 400, data = null) => {
  return res.status(statusCode).json({
    status: false,
    message,
    data
  });
};

