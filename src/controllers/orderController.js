import orderService from '../services/orderService.js';
import cartService from '../services/cartService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { toCityId, shippingAddress, paymentMethod = 'wallet' } = req.body;

    // Validate required fields
    if (!toCityId) {
      return sendError(res, 'To city ID (delivery city) is required', 400);
    }

    if (!shippingAddress) {
      return sendError(res, 'Shipping address is required', 400);
    }

    const toCityIdNum = parseInt(toCityId);
    if (isNaN(toCityIdNum) || toCityIdNum <= 0) {
      return sendError(res, 'Invalid to city ID', 400);
    }

    // Get cart items
    const cartItems = await cartService.getCart(userId);

    if (cartItems.length === 0) {
      return sendError(res, 'Cart is empty', 400);
    }

    // Convert cart items to order format
    const orderItems = cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }));

    // fromCityId will be automatically taken from each vendor's cityId
    const orders = await orderService.createOrder(
      userId, 
      orderItems, 
      toCityIdNum,
      shippingAddress, 
      paymentMethod
    );

    return sendSuccess(res, orders, 'Order created successfully', 201);
  } catch (error) {
    if (error.message === 'Cart is empty' || 
        error.message.includes('not found') ||
        error.message.includes('city') ||
        error.message.includes('shipping') ||
        error.message.includes('has no city')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(parseInt(id));

    return sendSuccess(res, order, 'Order retrieved successfully');
  } catch (error) {
    if (error.message === 'Order not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    const options = {
      status: status || null,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    };

    const result = await orderService.getUserOrders(userId, options);

    return sendSuccess(res, result, 'Orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getVendorOrders = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    const options = {
      status: status || null,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    };

    const result = await orderService.getVendorOrders(vendorId, options);

    return sendSuccess(res, result, 'Orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUser = req.user;

    if (!status) {
      return sendError(res, 'Status is required', 400);
    }

    const order = await orderService.updateOrderStatus(parseInt(id), status, currentUser);

    return sendSuccess(res, order, 'Order status updated successfully');
  } catch (error) {
    if (error.message === 'Order not found' || 
        error.message === 'Unauthorized to update this order' ||
        error.message === 'Invalid order status') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await orderService.cancelOrder(parseInt(id), userId);

    return sendSuccess(res, order, 'Order cancelled successfully');
  } catch (error) {
    if (error.message === 'Order not found' || 
        error.message === 'Unauthorized to cancel this order' ||
        error.message === 'Cannot cancel this order') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const calculateOrderPrice = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { toCityId } = req.query;

    // Validate required fields
    if (!toCityId) {
      return sendError(res, 'To city ID (delivery city) is required', 400);
    }

    const toCityIdNum = parseInt(toCityId);
    if (isNaN(toCityIdNum) || toCityIdNum <= 0) {
      return sendError(res, 'Invalid to city ID', 400);
    }

    const priceBreakdown = await orderService.calculateOrderPrice(userId, toCityIdNum);

    return sendSuccess(res, priceBreakdown, 'Order price calculated successfully');
  } catch (error) {
    if (error.message === 'Cart is empty' || 
        error.message === 'To city ID is required' ||
        error.message.includes('not found') ||
        error.message.includes('city') ||
        error.message.includes('has no city')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

