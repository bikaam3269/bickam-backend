import marketplaceSettingsService from '../services/marketplaceSettingsService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Get default expiration days (admin only)
 */
export const getDefaultExpirationDays = async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return sendError(res, 'Unauthorized. Admin access required.', 403);
    }

    const days = await marketplaceSettingsService.getDefaultExpirationDays();

    return sendSuccess(res, { expirationDays: days }, 'Default expiration days retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update default expiration days (admin only)
 */
export const updateDefaultExpirationDays = async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return sendError(res, 'Unauthorized. Admin access required.', 403);
    }

    const { expirationDays } = req.body;

    if (!expirationDays || expirationDays <= 0) {
      return sendError(res, 'expirationDays must be a positive number', 400);
    }

    const days = await marketplaceSettingsService.setDefaultExpirationDays(expirationDays);

    return sendSuccess(res, { expirationDays: days }, `Default expiration days updated to ${days} days`);
  } catch (error) {
    if (error.message.includes('must be a positive')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get all marketplace settings (admin only)
 */
export const getAllSettings = async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return sendError(res, 'Unauthorized. Admin access required.', 403);
    }

    const settings = await marketplaceSettingsService.getAllSettings();

    return sendSuccess(res, settings, 'Marketplace settings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

