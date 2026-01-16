import productSectionService from '../services/productSectionService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Get all product sections
 */
export const getAllSections = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    
    // Optional filters
    const filters = {
      type: req.query.type || null,
      vendorId: req.query.vendorId ? parseInt(req.query.vendorId, 10) : null,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId, 10) : null,
      page: req.query.page || 1,
      limit: req.query.limit || 50
    };

    // Remove null filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === null) {
        delete filters[key];
      }
    });

    const result = await productSectionService.getAllSections(includeInactive, filters);

    return sendSuccess(res, result, 'Product sections retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get product section by ID
 */
export const getSectionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const section = await productSectionService.getSectionById(parseInt(id));

    return sendSuccess(res, section, 'Product section retrieved successfully');
  } catch (error) {
    if (error.message === 'Product section not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Create product section
 */
export const createSection = async (req, res, next) => {
  try {
    const sectionData = { ...req.body };
    
    // Debug: Log received data
    console.log('Received sectionData:', JSON.stringify(sectionData, null, 2));
    console.log('Type value:', sectionData.type, 'Type of:', typeof sectionData.type);
    
    // Attach uploaded image filename if file was uploaded
    if (req.file) {
      sectionData.image = req.file.filename;
    }

    // Validate and clean type field - this is critical for ENUM
    if (sectionData.type === undefined || sectionData.type === null || sectionData.type === '') {
      return sendError(res, 'Type is required and must be one of: vendor, category, bestSellers, lastAdded', 400);
    }

    // Convert to string and trim
    sectionData.type = String(sectionData.type).trim();
    
    // Validate against allowed values (case-sensitive, must match ENUM exactly)
    const validTypes = ['vendor', 'category', 'bestSellers', 'lastAdded'];
    if (!validTypes.includes(sectionData.type)) {
      console.error(`Invalid type received: "${sectionData.type}". Valid types: ${validTypes.join(', ')}`);
      return sendError(res, `Invalid type "${sectionData.type}". Must be one of: ${validTypes.join(', ')}`, 400);
    }

    console.log('Validated type:', sectionData.type);

    // Convert empty strings to null for optional fields
    if (sectionData.vendorId === '' || sectionData.vendorId === null || sectionData.vendorId === undefined) {
      sectionData.vendorId = null;
    } else if (sectionData.vendorId) {
      sectionData.vendorId = parseInt(sectionData.vendorId, 10);
    }

    if (sectionData.categoryId === '' || sectionData.categoryId === null || sectionData.categoryId === undefined) {
      sectionData.categoryId = null;
    } else if (sectionData.categoryId) {
      sectionData.categoryId = parseInt(sectionData.categoryId, 10);
    }

    if (sectionData.appSettingId === '' || sectionData.appSettingId === null || sectionData.appSettingId === undefined) {
      sectionData.appSettingId = null;
    } else if (sectionData.appSettingId) {
      sectionData.appSettingId = parseInt(sectionData.appSettingId, 10);
    }

    if (sectionData.rows === '' || sectionData.rows === null || sectionData.rows === undefined) {
      sectionData.rows = undefined; // Let service set default
    } else if (sectionData.rows) {
      sectionData.rows = parseInt(sectionData.rows, 10);
    }

    if (sectionData.order === '' || sectionData.order === null || sectionData.order === undefined) {
      sectionData.order = undefined; // Let service set default
    } else if (sectionData.order) {
      sectionData.order = parseInt(sectionData.order, 10);
    }

    if (sectionData.isActive !== undefined && sectionData.isActive !== null && sectionData.isActive !== '') {
      sectionData.isActive = sectionData.isActive === 'true' || sectionData.isActive === true;
    } else {
      sectionData.isActive = undefined; // Let service set default
    }

    const section = await productSectionService.createSection(sectionData);

    return sendSuccess(res, section, 'Product section created successfully', 201);
  } catch (error) {
    if (error.message.includes('required') || 
        error.message.includes('must be') || 
        error.message.includes('Invalid') ||
        error.message.includes('between') ||
        error.message.includes('Data truncated')) {
      return sendError(res, error.message, 400);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

/**
 * Update product section
 */
export const updateSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sectionData = { ...req.body };
    
    // Attach uploaded image filename if file was uploaded
    if (req.file) {
      sectionData.image = req.file.filename;
    }

    // Convert string numbers to integers
    if (sectionData.vendorId) {
      sectionData.vendorId = parseInt(sectionData.vendorId, 10);
    }
    if (sectionData.categoryId) {
      sectionData.categoryId = parseInt(sectionData.categoryId, 10);
    }
    if (sectionData.appSettingId) {
      sectionData.appSettingId = parseInt(sectionData.appSettingId, 10);
    }
    if (sectionData.rows) {
      sectionData.rows = parseInt(sectionData.rows, 10);
    }
    if (sectionData.order) {
      sectionData.order = parseInt(sectionData.order, 10);
    }
    if (sectionData.isActive !== undefined) {
      sectionData.isActive = sectionData.isActive === 'true' || sectionData.isActive === true;
    }

    const section = await productSectionService.updateSection(parseInt(id), sectionData);

    return sendSuccess(res, section, 'Product section updated successfully');
  } catch (error) {
    if (error.message === 'Product section not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('required') || 
        error.message.includes('must be') || 
        error.message.includes('Invalid') ||
        error.message.includes('between')) {
      return sendError(res, error.message, 400);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

/**
 * Delete product section
 */
export const deleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await productSectionService.deleteSection(parseInt(id));

    return sendSuccess(res, result, result.message || 'Product section deleted successfully');
  } catch (error) {
    if (error.message === 'Product section not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Reorder sections
 */
export const reorderSections = async (req, res, next) => {
  try {
    const { sections } = req.body;

    if (!Array.isArray(sections)) {
      return sendError(res, 'Sections must be an array', 400);
    }

    const updatedSections = await productSectionService.reorderSections(sections);

    return sendSuccess(res, updatedSections, 'Sections reordered successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get products for a section
 */
export const getSectionProducts = async (req, res, next) => {
  try {
    const { type, id } = req.query;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const userId = req.user ? req.user.id : null;

    if (!type) {
      return sendError(res, 'Type parameter is required', 400);
    }

    // Validate pagination
    if (page < 1) {
      return sendError(res, 'Page must be greater than 0', 400);
    }
    if (limit < 1 || limit > 100) {
      return sendError(res, 'Limit must be between 1 and 100', 400);
    }

    const result = await productSectionService.getSectionProducts(type, id, page, limit, userId);

    return sendSuccess(res, result, 'Products retrieved successfully');
  } catch (error) {
    if (error.message.includes('Type must be') || 
        error.message.includes('ID is required') ||
        error.message.includes('must be between')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};
