import affiliateService from '../services/affiliateService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Get all marketers (users with type 'marketing')
 */
export const getMarketers = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      governmentId: req.query.governmentId,
      cityId: req.query.cityId
    };

    const marketers = await affiliateService.getMarketers(filters);

    return sendSuccess(res, marketers, 'Marketers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get marketer by ID
 */
export const getMarketerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const marketer = await affiliateService.getMarketerById(id);

    return sendSuccess(res, marketer, 'Marketer retrieved successfully');
  } catch (error) {
    if (error.message === 'Marketer not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};















