import cartService from '../services/cartService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cartItems = await cartService.getCart(userId);
    const total = await cartService.getCartTotal(userId);

    return sendSuccess(res, {
      items: cartItems,
      total
    }, 'Cart retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, quantity, size, color } = req.body;

    if (!productId) {
      return sendError(res, 'Product ID is required', 400);
    }

    const cartItem = await cartService.addToCart(
      userId, 
      productId, 
      quantity || 1, 
      size || null, 
      color || null
    );

    return sendSuccess(res, cartItem, 'Item added to cart successfully', 201);
  } catch (error) {
    if (error.message === 'Product not found' || 
        error.message === 'Product has no vendor' ||
        error.message === 'Cart contains product with no vendor' ||
        error.message.includes('Cannot add product from different vendor') ||
        error.message.includes('Invalid size') ||
        error.message.includes('Invalid color')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return sendError(res, 'Valid quantity is required', 400);
    }

    const result = await cartService.updateCartItem(userId, parseInt(id), quantity);

    return sendSuccess(res, result, 'Cart item updated successfully');
  } catch (error) {
    if (error.message === 'Cart item not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await cartService.removeFromCart(userId, parseInt(id));

    return sendSuccess(res, result, 'Item removed from cart successfully');
  } catch (error) {
    if (error.message === 'Cart item not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await cartService.clearCart(userId);

    return sendSuccess(res, result, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
};

