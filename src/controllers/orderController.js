import orderService from '../services/orderService.js';
import cartService from '../services/cartService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, paymentMethod = 'wallet' } = req.body;

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

    const orders = await orderService.createOrder(userId, orderItems, shippingAddress, paymentMethod);

    return sendSuccess(res, orders, 'Order created successfully', 201);
  } catch (error) {
    if (error.message === 'Cart is empty' || 
        error.message === 'Insufficient wallet balance' ||
        error.message.includes('not found')) {
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
    const orders = await orderService.getUserOrders(userId);

    return sendSuccess(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getVendorOrders = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const orders = await orderService.getVendorOrders(vendorId);

    return sendSuccess(res, orders, 'Orders retrieved successfully');
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

