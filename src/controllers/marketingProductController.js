import marketingProductService from '../services/marketingProductService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getAllMarketingProducts = async (req, res, next) => {
  try {
    const filters = {
      governmentId: req.query.governmentId ? parseInt(req.query.governmentId) : undefined,
      cityId: req.query.cityId ? parseInt(req.query.cityId) : undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId) : undefined,
      subcategoryId: req.query.subcategoryId ? parseInt(req.query.subcategoryId) : undefined,
      search: req.query.search,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      page: req.query.page || 1,
      limit: req.query.limit || 50
    };

    const result = await marketingProductService.getAllMarketingProducts(filters);

    return sendSuccess(res, result, 'Marketing products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getMarketingProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await marketingProductService.getMarketingProductById(id);

    return sendSuccess(res, product, 'Marketing product retrieved successfully');
  } catch (error) {
    if (error.message === 'Marketing product not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const createMarketingProduct = async (req, res, next) => {
  try {
    // Only admin can create marketing products
    if (req.user.type !== 'admin') {
      return sendError(res, 'Only admin can create marketing products', 403);
    }

    const productData = { ...req.body };
    
    // Attach uploaded image filenames (if any)
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(f => f.filename);
    }

    const product = await marketingProductService.createMarketingProduct(productData);

    return sendSuccess(res, product, 'Marketing product created successfully', 201);
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('must be')) {
      return sendError(res, error.message, 400);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const updateMarketingProduct = async (req, res, next) => {
  try {
    // Only admin can update marketing products
    if (req.user.type !== 'admin') {
      return sendError(res, 'Only admin can update marketing products', 403);
    }

    const { id } = req.params;
    const productData = { ...req.body };

    // Handle uploaded images (if any new images are uploaded)
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => f.filename);

      // If existingImages is provided in form data, merge with new images
      if (productData.existingImages) {
        const existingImages = Array.isArray(productData.existingImages)
          ? productData.existingImages
          : [productData.existingImages];
        productData.images = [...existingImages, ...newImages];
        delete productData.existingImages;
      } else {
        // Replace all images with new ones
        productData.images = newImages;
      }
    } else if (productData.existingImages) {
      // No new images uploaded, but existingImages provided
      productData.images = Array.isArray(productData.existingImages)
        ? productData.existingImages
        : [productData.existingImages];
      delete productData.existingImages;
    }

    // Convert string values to appropriate types from form data
    if (productData.price !== undefined) {
      productData.price = parseFloat(productData.price);
    }
    if (productData.discount !== undefined) {
      productData.discount = parseFloat(productData.discount);
    }
    if (productData.isPrice !== undefined) {
      productData.isPrice = productData.isPrice === 'true' || productData.isPrice === true;
    }
    if (productData.categoryId !== undefined) {
      productData.categoryId = parseInt(productData.categoryId);
    }
    if (productData.subcategoryId !== undefined) {
      productData.subcategoryId = parseInt(productData.subcategoryId);
    }
    if (productData.quantity !== undefined) {
      productData.quantity = parseInt(productData.quantity);
    }
    if (productData.isActive !== undefined) {
      productData.isActive = productData.isActive === 'true' || productData.isActive === true || productData.isActive === '1' || productData.isActive === 1;
    }
    if (productData.governmentId !== undefined) {
      productData.governmentId = productData.governmentId ? parseInt(productData.governmentId) : null;
    }
    if (productData.cityId !== undefined) {
      productData.cityId = productData.cityId ? parseInt(productData.cityId) : null;
    }

    const product = await marketingProductService.updateMarketingProduct(id, productData);

    return sendSuccess(res, product, 'Marketing product updated successfully');
  } catch (error) {
    if (error.message === 'Marketing product not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('must be')) {
      return sendError(res, error.message, 400);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const deleteMarketingProduct = async (req, res, next) => {
  try {
    // Only admin can delete marketing products
    if (req.user.type !== 'admin') {
      return sendError(res, 'Only admin can delete marketing products', 403);
    }

    const { id } = req.params;
    await marketingProductService.deleteMarketingProduct(id);

    return sendSuccess(res, null, 'Marketing product deleted successfully');
  } catch (error) {
    if (error.message === 'Marketing product not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

