import appSettingsService from '../services/appSettingsService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Get all app settings
 */
export const getAllSettings = async (req, res, next) => {
  try {
    const settings = await appSettingsService.getAllSettings();
    return sendSuccess(res, settings, 'App settings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get app settings by ID
 */
export const getSettingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const settings = await appSettingsService.getSettingByName(id);
    
    if (!settings) {
      return sendError(res, 'App settings not found', 404);
    }

    return sendSuccess(res, settings, 'App settings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get main app settings (or create if not exists)
 */
export const getMainSettings = async (req, res, next) => {
  try {
    let settings = await appSettingsService.getMainSettings();
    
    // If settings don't exist, create default ones
    if (!settings) {
      settings = await appSettingsService.createSettings({
        name: 'app_main',
        description: 'Main App Settings',
        value: '{}',
        isLiveStreamEnabled: true,
        isLoginEnabled: true,
        isUnderDevelopment: false
      });
      return sendSuccess(res, settings, 'Main app settings created successfully', 201);
    }

    return sendSuccess(res, settings, 'Main app settings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create app settings
 */
export const createSettings = async (req, res, next) => {
  try {
    const settings = await appSettingsService.createSettings(req.body);
    return sendSuccess(res, settings, 'App settings created successfully', 201);
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('already exists')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Update app settings
 */
export const updateSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const settings = await appSettingsService.updateSettings(id, req.body);
    return sendSuccess(res, settings, 'App settings updated successfully');
  } catch (error) {
    if (error.message === 'App settings not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('already exists') || error.message.includes('Cannot delete')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Update main app settings
 */
export const updateMainSettings = async (req, res, next) => {
  try {
    const settings = await appSettingsService.updateMainSettings(req.body);
    return sendSuccess(res, settings, 'Main app settings updated successfully');
  } catch (error) {
    if (error.message.includes('already exists')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Delete app settings
 */
export const deleteSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    await appSettingsService.deleteSettings(id);
    return sendSuccess(res, null, 'App settings deleted successfully');
  } catch (error) {
    if (error.message === 'App settings not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('Cannot delete')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

