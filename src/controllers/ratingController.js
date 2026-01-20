import ratingService from '../services/ratingService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Rate a vendor
 * POST /api/v1/ratings
 */
export const rateVendor = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { vendorId, rating, comment, orderId } = req.body;

    if (!vendorId || !rating) {
      return sendError(res, 'Vendor ID and rating are required', 400);
    }

    const vendorRating = await ratingService.rateVendor(
      userId,
      parseInt(vendorId),
      parseInt(rating),
      comment || null,
      orderId ? parseInt(orderId) : null
    );

    return sendSuccess(res, vendorRating, 'Vendor rated successfully', 201);
  } catch (error) {
    if (error.message === 'Vendor not found' || error.message === 'User is not a vendor') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'You cannot rate yourself') {
      return sendError(res, error.message, 400);
    }
    if (error.message === 'Order not found' || error.message.includes('Order does not')) {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Rating must be between 1 and 5') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get vendor ratings
 * GET /api/v1/ratings/vendor/:vendorId
 */
export const getVendorRatings = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await ratingService.getVendorRatings(
      parseInt(vendorId),
      parseInt(page),
      parseInt(limit)
    );

    return sendSuccess(res, result, 'Vendor ratings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's rating for a vendor
 * GET /api/v1/ratings/vendor/:vendorId/my
 */
export const getMyRatingForVendor = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { vendorId } = req.params;

    const rating = await ratingService.getUserRatingForVendor(userId, parseInt(vendorId));

    if (!rating) {
      return sendSuccess(res, null, 'No rating found for this vendor');
    }

    return sendSuccess(res, rating, 'Rating retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update user's rating for a vendor
 * PUT /api/v1/ratings/vendor/:vendorId
 */
export const updateRating = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { vendorId } = req.params;
    const { rating, comment } = req.body;

    if (!rating) {
      return sendError(res, 'Rating is required', 400);
    }

    const vendorRating = await ratingService.updateRating(
      userId,
      parseInt(vendorId),
      parseInt(rating),
      comment || null
    );

    return sendSuccess(res, vendorRating, 'Rating updated successfully');
  } catch (error) {
    if (error.message === 'Rating not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Rating must be between 1 and 5') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Delete user's rating for a vendor
 * DELETE /api/v1/ratings/vendor/:vendorId
 */
export const deleteRating = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { vendorId } = req.params;

    const result = await ratingService.deleteRating(userId, parseInt(vendorId));

    return sendSuccess(res, result, 'Rating deleted successfully');
  } catch (error) {
    if (error.message === 'Rating not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Get vendor rating summary (for vendor dashboard)
 * GET /api/v1/ratings/vendor/:vendorId/summary
 */
export const getVendorRatingSummary = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    const summary = await ratingService.getVendorRatingSummary(parseInt(vendorId));

    return sendSuccess(res, summary, 'Vendor rating summary retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete rating by rateId
 * DELETE /api/v1/ratings/:rateId
 */
export const deleteRatingById = async (req, res, next) => {
  try {
    const { rateId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.type === 'admin';

    const result = await ratingService.deleteRatingById(
      parseInt(rateId),
      userId,
      isAdmin
    );

    return sendSuccess(res, result, 'Rating deleted successfully');
  } catch (error) {
    if (error.message === 'Rating not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Unauthorized to delete this rating') {
      return sendError(res, error.message, 403);
    }
    next(error);
  }
};









