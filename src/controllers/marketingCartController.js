import marketingCartService from '../services/marketingCartService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Get marketing cart for authenticated marketer
 */
export const getCart = async (req, res, next) => {
  try {
    const marketerId = req.user.id;
    const cartItems = await marketingCartService.getCart(marketerId);
    return sendSuccess(res, cartItems, 'Marketing cart retrieved successfully');
  } catch (error) {
    if (error.message.includes('not a marketer')) {
      return sendError(res, error.message, 403);
    }
    next(error);
  }
};

/**
 * Add marketing product to cart
 */
export const addToCart = async (req, res, next) => {
  try {
    const marketerId = req.user.id;
    const { marketingProductId, quantity } = req.body;

    if (!marketingProductId) {
      return sendError(res, 'Marketing product ID is required', 400);
    }

    const cartItem = await marketingCartService.addToCart(
      marketerId,
      marketingProductId,
      quantity || 1
    );

    return sendSuccess(res, cartItem, 'Product added to marketing cart successfully', 201);
  } catch (error) {
    if (error.message.includes('not a marketer') || error.message.includes('not found') || error.message.includes('not active')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Update cart item quantity
 */
export const updateCartItem = async (req, res, next) => {
  try {
    const marketerId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return sendError(res, 'Quantity must be at least 1', 400);
    }

    const cartItem = await marketingCartService.updateCartItem(marketerId, id, quantity);
    return sendSuccess(res, cartItem, 'Cart item updated successfully');
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('must be at least')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (req, res, next) => {
  try {
    const marketerId = req.user.id;
    const { id } = req.params;

    await marketingCartService.removeFromCart(marketerId, id);
    return sendSuccess(res, null, 'Item removed from cart successfully');
  } catch (error) {
    if (error.message.includes('not found')) {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Clear cart
 */
export const clearCart = async (req, res, next) => {
  try {
    const marketerId = req.user.id;
    await marketingCartService.clearCart(marketerId);
    return sendSuccess(res, null, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
};













