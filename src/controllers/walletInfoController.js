import walletInfoService from '../services/walletInfoService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Get all wallet info
 * Query params: activeOnly (true/false) - filter by active status
 * For /active route, automatically sets activeOnly to true
 */
export const getAllWalletInfo = async (req, res, next) => {
  try {
    // If route is /active, automatically filter by active only
    const isActiveRoute = req.path === '/active' || req.path.endsWith('/active');
    const { activeOnly } = req.query;
    
    // If it's the /active route, force activeOnly to true
    // Otherwise, use query param (defaults to false if not provided)
    const activeOnlyBool = isActiveRoute ? true : (activeOnly === 'true');

    const walletInfos = await walletInfoService.getAllWalletInfo(activeOnlyBool);

    return sendSuccess(res, walletInfos, 'Wallet info retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get wallet info by ID
 */
export const getWalletInfoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const walletInfo = await walletInfoService.getWalletInfoById(parseInt(id));

    return sendSuccess(res, walletInfo, 'Wallet info retrieved successfully');
  } catch (error) {
    if (error.message === 'Wallet info not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Create new wallet info (Admin only)
 */
export const createWalletInfo = async (req, res, next) => {
  try {
    const { name, walletId, isActive, displayOrder } = req.body;

    if (!name || !walletId) {
      return sendError(res, 'Name and wallet ID are required', 400);
    }

    const walletInfo = await walletInfoService.createWalletInfo({
      name,
      walletId,
      isActive,
      displayOrder
    });

    return sendSuccess(res, walletInfo, 'Wallet info created successfully', 201);
  } catch (error) {
    if (error.message === 'Name and wallet ID are required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Update wallet info (Admin only)
 */
export const updateWalletInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, walletId, isActive, displayOrder } = req.body;

    const walletInfo = await walletInfoService.updateWalletInfo(parseInt(id), {
      name,
      walletId,
      isActive,
      displayOrder
    });

    return sendSuccess(res, walletInfo, 'Wallet info updated successfully');
  } catch (error) {
    if (error.message === 'Wallet info not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Delete wallet info (Admin only)
 */
export const deleteWalletInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await walletInfoService.deleteWalletInfo(parseInt(id));

    return sendSuccess(res, result, 'Wallet info deleted successfully');
  } catch (error) {
    if (error.message === 'Wallet info not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

