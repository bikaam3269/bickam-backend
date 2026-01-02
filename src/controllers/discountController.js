import discountService from '../services/discountService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';
import Product from '../models/Product.js';
import { Op } from 'sequelize';

/**
 * Create a new discount
 */
export const createDiscount = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { title, body, startDate, endDate, discount, products } = req.body;
    const image = req.file ? req.file.filename : null;

    // Validate required fields
    if (!title || !startDate || !endDate || discount === undefined || discount === null) {
      return sendError(res, 'Title, start date, end date, and discount percentage are required', 400);
    }

    // Handle products - it might come as a string that needs to be parsed
    console.log('Received products:', products, 'Type:', typeof products);
    let productsArray = products;
    if (typeof products === 'string') {
      try {
        // Try to parse as JSON first
        productsArray = JSON.parse(products);
      } catch (e) {
        // If JSON.parse fails, try to parse as comma-separated string like "11" or "11,12,13"
        const trimmed = products.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          // It's already in array format string, try to parse again
          try {
            productsArray = JSON.parse(trimmed);
          } catch (e2) {
            return sendError(res, `Products must be a valid array. Received: ${products}`, 400);
          }
        } else {
          // Try to split by comma and convert to numbers
          const parts = trimmed.split(',').map(p => p.trim()).filter(p => p);
          if (parts.length > 0) {
            productsArray = parts.map(p => {
              const num = parseInt(p, 10);
              return isNaN(num) ? p : num;
            });
          } else {
            return sendError(res, `Products must be a valid array. Received: ${products}`, 400);
          }
        }
      }
    }

    if (!productsArray || !Array.isArray(productsArray) || productsArray.length === 0) {
      return sendError(res, `Products array is required and must not be empty. Received: ${JSON.stringify(products)}`, 400);
    }

    console.log('Parsed productsArray:', productsArray);
    console.log('Vendor ID:', vendorId);

    const discountRecord = await discountService.createDiscount(vendorId, {
      title,
      body,
      image,
      startDate,
      endDate,
      discount: parseFloat(discount),
      products: productsArray // Now just array of product IDs
    });

    return sendSuccess(res, discountRecord, 'Discount created successfully', 201);
  } catch (error) {
    if (error.message.includes('required') ||
        error.message.includes('not found') ||
        error.message.includes('already in an active discount') ||
        error.message.includes('must be') ||
        error.message.includes('must not')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get all discounts for authenticated vendor
 */
export const getMyDiscounts = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const discounts = await discountService.getVendorDiscounts(vendorId);

    return sendSuccess(res, discounts, 'Discounts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get discount by ID
 */
export const getDiscountById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;

    const discount = await discountService.getDiscountById(parseInt(id), vendorId);

    return sendSuccess(res, discount, 'Discount retrieved successfully');
  } catch (error) {
    if (error.message === 'Discount not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Update discount
 */
export const updateDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;
    const { title, body, startDate, endDate, discount: discountPercent, products } = req.body;
    const image = req.file ? req.file.filename : undefined;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (body !== undefined) updateData.body = body;
    if (image !== undefined) updateData.image = image;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (discountPercent !== undefined && discountPercent !== null) updateData.discount = parseFloat(discountPercent);
    
    // Handle products - it might come as a string that needs to be parsed
    if (products !== undefined) {
      let productsArray = products;
      if (typeof products === 'string') {
        try {
          productsArray = JSON.parse(products);
        } catch (e) {
          return sendError(res, 'Products must be a valid array', 400);
        }
      }
      if (productsArray !== undefined) {
        if (!Array.isArray(productsArray) || productsArray.length === 0) {
          return sendError(res, 'Products must be a valid non-empty array', 400);
        }
        updateData.products = productsArray; // Now just array of product IDs
      }
    }

    const updatedDiscount = await discountService.updateDiscount(parseInt(id), vendorId, updateData);

    return sendSuccess(res, updatedDiscount, 'Discount updated successfully');
  } catch (error) {
    if (error.message === 'Discount not found' ||
        error.message.includes('required') ||
        error.message.includes('already in an active discount') ||
        error.message.includes('must be')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Delete discount
 */
export const deleteDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;

    const result = await discountService.deleteDiscount(parseInt(id), vendorId);

    return sendSuccess(res, result, 'Discount deleted successfully');
  } catch (error) {
    if (error.message === 'Discount not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Check if a product is in an active discount
 */
export const checkProductInDiscount = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return sendError(res, 'Product ID is required', 400);
    }

    const result = await discountService.checkProductInDiscount(parseInt(productId));

    if (!result) {
      return sendSuccess(res, { inDiscount: false }, 'Product is not in any active discount');
    }

    return sendSuccess(res, result, 'Product discount information retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active discounts (for users) with filters
 */
export const getAllActiveDiscounts = async (req, res, next) => {
  try {
    const { governmentId, categoryId, minPrice, maxPrice } = req.query;

    const filters = {};
    if (governmentId) filters.governmentId = governmentId;
    if (categoryId) filters.categoryId = categoryId;
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;

    const discounts = await discountService.getAllActiveDiscounts(filters);

    return sendSuccess(res, discounts, 'Active discounts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get discounts by vendor ID (for users)
 */
export const getDiscountsByVendorId = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return sendError(res, 'Vendor ID is required', 400);
    }

    const discounts = await discountService.getDiscountsByVendorId(parseInt(vendorId));

    return sendSuccess(res, discounts, 'Vendor discounts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get discount details for customers (public endpoint)
 */
export const getDiscountDetailsForCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null; // Optional authentication for favorites/cart status
    
    const discount = await discountService.getDiscountById(id, null, userId);
    
    if (!discount) {
      return sendError(res, 'Discount not found', 404);
    }
    
    // Check if discount is active
    const now = new Date();
    const startDate = new Date(discount.startDate);
    const endDate = new Date(discount.endDate);
    
    if (!discount.isActive || startDate > now || endDate < now) {
      return sendError(res, 'Discount is not currently active', 404);
    }
    
    return sendSuccess(res, discount, 'Discount retrieved successfully');
  } catch (error) {
    next(error);
  }
};

