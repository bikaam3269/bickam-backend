import marketplaceProductService from '../services/marketplaceProductService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Create a new marketplace product (user)
 */
export const createMarketplaceProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const productData = {
      name: req.body.name,
      description: req.body.description,
      phone: req.body.phone,
      price: req.body.price,
      files: []
    };

    // Handle uploaded files (images or videos)
    if (req.files && req.files.length > 0) {
      productData.files = req.files.map(file => file.filename);
    }

    const product = await marketplaceProductService.createProduct(userId, productData);

    return sendSuccess(res, product, 'Marketplace product created successfully. Waiting for admin approval.', 201);
  } catch (error) {
    if (error.message.includes('required')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get all approved marketplace products (public)
 */
export const getAllMarketplaceProducts = async (req, res, next) => {
  try {
    const filters = {
      status: 'approved', // Only show approved products
      search: req.query.search,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      page: req.query.page || 1,
      limit: req.query.limit || 50
    };

    const result = await marketplaceProductService.getAllProducts(filters);

    return sendSuccess(res, result, 'Marketplace products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get marketplace product by ID
 */
export const getMarketplaceProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await marketplaceProductService.getProductById(id);

    // Only show approved products to non-admin users
    if (req.user?.type !== 'admin' && product.status !== 'approved') {
      return sendError(res, 'Product not found', 404);
    }

    // Check if product is expired
    if (product.status === 'approved' && product.expiresAt && new Date(product.expiresAt) < new Date()) {
      return sendError(res, 'Product has expired', 404);
    }

    return sendSuccess(res, product, 'Marketplace product retrieved successfully');
  } catch (error) {
    if (error.message === 'Marketplace product not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Get pending products (admin only)
 */
export const getPendingMarketplaceProducts = async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return sendError(res, 'Unauthorized. Admin access required.', 403);
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 50;

    const result = await marketplaceProductService.getPendingProducts(page, limit);

    return sendSuccess(res, result, 'Pending marketplace products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Approve marketplace product (admin only)
 */
export const approveMarketplaceProduct = async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return sendError(res, 'Unauthorized. Admin access required.', 403);
    }

    const { id } = req.params;
    const expirationDays = req.body.expirationDays || 10; // Default 10 days

    const product = await marketplaceProductService.approveProduct(id, req.user.id, expirationDays);

    return sendSuccess(res, product, `Product approved successfully. Will expire in ${expirationDays} days.`);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('already')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Reject marketplace product (admin only)
 */
export const rejectMarketplaceProduct = async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return sendError(res, 'Unauthorized. Admin access required.', 403);
    }

    const { id } = req.params;
    const rejectionReason = req.body.rejectionReason || null;

    const product = await marketplaceProductService.rejectProduct(id, req.user.id, rejectionReason);

    return sendSuccess(res, product, 'Product rejected successfully');
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('already')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Update product expiration (admin only)
 */
export const updateProductExpiration = async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return sendError(res, 'Unauthorized. Admin access required.', 403);
    }

    const { id } = req.params;
    const { expirationDays } = req.body;

    if (!expirationDays || expirationDays <= 0) {
      return sendError(res, 'expirationDays must be a positive number', 400);
    }

    const product = await marketplaceProductService.updateExpiration(id, expirationDays);

    return sendSuccess(res, product, `Product expiration updated to ${expirationDays} days`);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Only approved')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Delete marketplace product
 */
export const deleteMarketplaceProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.type;

    await marketplaceProductService.deleteProduct(id, userId, userType);

    return sendSuccess(res, null, 'Product deleted successfully');
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
      return sendError(res, error.message, error.message.includes('Unauthorized') ? 403 : 404);
    }
    next(error);
  }
};

/**
 * Get user's marketplace products
 */
export const getUserMarketplaceProducts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    console.log('========================================');
    console.log('[getUserMarketplaceProducts] User ID:', userId);
    console.log('[getUserMarketplaceProducts] User ID Type:', typeof userId);
    console.log('[getUserMarketplaceProducts] Full User Object:', JSON.stringify(req.user, null, 2));
    console.log('========================================');
    
    // Handle status query parameter - ignore empty strings, dots, or whitespace
    let status = req.query.status;
    if (!status || status.trim() === '' || status.trim() === '.') {
      status = null;
    } else {
      status = status.trim();
    }

    console.log('[getUserMarketplaceProducts] Request:', { userId, status, userType: req.user.type });

    const products = await marketplaceProductService.getUserProducts(userId, status);

    console.log('[getUserMarketplaceProducts] Response:', { count: products.length });

    return sendSuccess(res, products, 'User marketplace products retrieved successfully');
  } catch (error) {
    console.error('[getUserMarketplaceProducts] Error:', error);
    next(error);
  }
};

/**
 * Get all marketplace products with status filter (admin only)
 */
export const getAllMarketplaceProductsAdmin = async (req, res, next) => {
  try {
    if (req.user.type !== 'admin') {
      return sendError(res, 'Unauthorized. Admin access required.', 403);
    }

    const filters = {
      status: req.query.status || null, // Admin can see all statuses
      userId: req.query.userId || null,
      search: req.query.search,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      page: req.query.page || 1,
      limit: req.query.limit || 50
    };

    const result = await marketplaceProductService.getAllProducts(filters);

    return sendSuccess(res, result, 'Marketplace products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

