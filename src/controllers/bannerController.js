import bannerService from '../services/bannerService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getAllBanners = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    
    // Optional filters
    const filters = {
      actionType: req.query.actionType || null,
      vendorId: req.query.vendorId ? parseInt(req.query.vendorId, 10) : null,
      productId: req.query.productId ? parseInt(req.query.productId, 10) : null,
      governorateId: req.query.governorateId ? parseInt(req.query.governorateId, 10) : null,
      action: req.query.action || null
    };

    // Remove null filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === null) {
        delete filters[key];
      }
    });

    const banners = await bannerService.getAllBanners(includeInactive, filters);

    return sendSuccess(res, banners, 'Banners retrieved successfully');
  } catch (error) {
    if (error.message.includes('Invalid') || error.message.includes('must be')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getBannerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await bannerService.getBannerById(parseInt(id));

    return sendSuccess(res, banner, 'Banner retrieved successfully');
  } catch (error) {
    if (error.message === 'Banner not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const createBanner = async (req, res, next) => {
  try {
    const bannerData = { ...req.body };
    
    // Attach uploaded image filename if file was uploaded
    if (req.file) {
      bannerData.image = req.file.filename;
    } else if (!bannerData.image) {
      return sendError(res, 'Banner image is required', 400);
    }

    // Convert empty strings to null for actionType and action
    if (bannerData.actionType === '' || bannerData.actionType === 'null') {
      bannerData.actionType = null;
    }
    if (bannerData.action === '' || bannerData.action === 'null') {
      bannerData.action = null;
    }

    const banner = await bannerService.createBanner(bannerData);

    return sendSuccess(res, banner, 'Banner created successfully', 201);
  } catch (error) {
    if (error.message === 'Banner image is required') {
      return sendError(res, error.message, 400);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bannerData = { ...req.body };
    
    // Attach uploaded image filename if file was uploaded
    if (req.file) {
      bannerData.image = req.file.filename;
    }

    // Convert empty strings to null for actionType and action
    if (bannerData.actionType === '' || bannerData.actionType === 'null') {
      bannerData.actionType = null;
    }
    if (bannerData.action === '' || bannerData.action === 'null') {
      bannerData.action = null;
    }

    const banner = await bannerService.updateBanner(parseInt(id), bannerData);

    return sendSuccess(res, banner, 'Banner updated successfully');
  } catch (error) {
    if (error.message === 'Banner not found') {
      return sendError(res, error.message, 404);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await bannerService.deleteBanner(parseInt(id));

    return sendSuccess(res, result, result.message || 'Banner deleted successfully');
  } catch (error) {
    if (error.message === 'Banner not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getAdvertisementBanners = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    
    const banners = await bannerService.getAdvertisementBanners(includeInactive);

    return sendSuccess(res, banners, 'Advertisement banners retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const reorderBanners = async (req, res, next) => {
  try {
    const { banners } = req.body;

    if (!Array.isArray(banners)) {
      return sendError(res, 'Banners must be an array', 400);
    }

    const updatedBanners = await bannerService.reorderBanners(banners);

    return sendSuccess(res, updatedBanners, 'Banners reordered successfully');
  } catch (error) {
    next(error);
  }
};



