import cartService from '../services/cartService.js';

export const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cartItems = await cartService.getCart(userId);
    const total = await cartService.getCartTotal(userId);

    res.json({
      success: true,
      data: {
        items: cartItems,
        total
      }
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Product ID is required' }
      });
    }

    const cartItem = await cartService.addToCart(userId, productId, quantity || 1);

    res.status(201).json({
      success: true,
      data: cartItem
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
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
      return res.status(400).json({
        success: false,
        error: { message: 'Valid quantity is required' }
      });
    }

    const result = await cartService.updateCartItem(userId, parseInt(id), quantity);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Cart item not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await cartService.removeFromCart(userId, parseInt(id));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Cart item not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await cartService.clearCart(userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

