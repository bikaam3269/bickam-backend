import productService from '../services/productService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getAllProducts = async (req, res, next) => {
  try {
    const filters = {
      vendorId: req.query.vendorId,
      categoryId: req.query.categoryId,
      subcategoryId: req.query.subcategoryId,
      search: req.query.search,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      minQuantity: req.query.minQuantity ? parseInt(req.query.minQuantity) : undefined
    };

    const products = await productService.getAllProducts(filters);

    return sendSuccess(res, products, 'Products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const product = await productService.getProductById(id, userId);

    return sendSuccess(res, product, 'Product retrieved successfully');
  } catch (error) {
    if (error.message === 'Product not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    // Only vendors can create products
    if (req.user.type !== 'vendor' && req.user.type !== 'admin') {
      return sendError(res, 'Only vendors can create products', 403);
    }

    const productData = { ...req.body };
    // Attach vendorId based on user role
    if (req.user.type === 'vendor') {
      productData.vendorId = req.user.id;
    } else if (req.user.type === 'admin' && !productData.vendorId) {
      return sendError(res, 'Admin must specify vendorId for the product', 400);
    }
    // Attach uploaded image filenames (if any)
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(f => f.filename);
    }
    const product = await productService.createProduct(productData);

    return sendSuccess(res, product, 'Product created successfully', 201);
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

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Extract all data from form data
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

    const product = await productService.updateProduct(id, productData, req.user);

    return sendSuccess(res, product, 'Product updated successfully');
  } catch (error) {
    if (error.message === 'Product not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Unauthorized to update this product') {
      return sendError(res, error.message, 403);
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

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id, req.user);

    return sendSuccess(res, null, 'Product deleted successfully');
  } catch (error) {
    if (error.message === 'Product not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Unauthorized to delete this product') {
      return sendError(res, error.message, 403);
    }
    next(error);
  }
};

export const getProductsByVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const subcategoryId = req.query.subcategoryId ? parseInt(req.query.subcategoryId) : null;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const sortBy = req.query.sortBy || 'latest'; // latest, price_asc, price_desc, offers
    const currentUserId = req.user ? req.user.id : null;

    const result = await productService.getProductsByVendor(vendorId, page, limit, subcategoryId, isActive, sortBy, currentUserId);

    return sendSuccess(res, result, 'Products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getMyProducts = async (req, res, next) => {
  try {
    // Only vendors can access this endpoint
    if (req.user.type !== 'vendor') {
      return sendError(res, 'Only vendors can access this endpoint', 403);
    }

    console.log('Getting products for vendor ID:', req.user.id);
    console.log('User type:', req.user.type);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : null;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const result = await productService.getMyProducts(req.user.id, page, limit, categoryId, isActive);

    console.log('Result from service:', JSON.stringify(result, null, 2));

    return sendSuccess(res, result, 'Products retrieved successfully');
  } catch (error) {
    console.error('Error in getMyProducts:', error);
    next(error);
  }
};

