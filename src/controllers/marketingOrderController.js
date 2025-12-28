import marketingOrderService from '../services/marketingOrderService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Create order from marketing cart
 */
export const createOrder = async (req, res, next) => {
  try {
    const marketerId = req.user.id;
    const { toCityId, shippingAddress, phone, paymentMethod } = req.body;

    if (!phone) {
      return sendError(res, 'Phone number is required', 400);
    }

    const orders = await marketingOrderService.createOrder(
      marketerId,
      toCityId,
      shippingAddress,
      phone,
      paymentMethod || 'wallet'
    );

    return sendSuccess(res, orders, 'Marketing order created successfully', 201);
  } catch (error) {
    if (error.message.includes('not a marketer') || error.message.includes('empty') || error.message.includes('not found') || error.message.includes('not active') || error.message.includes('zero')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get all orders for authenticated marketer (or all orders for admin)
 */
export const getMarketerOrders = async (req, res, next) => {
  try {
    // If admin, pass null to get all orders. Otherwise, use marketer ID
    const marketerId = req.user.type === 'admin' ? null : req.user.id;
    const filters = {
      status: req.query.status,
      paymentStatus: req.query.paymentStatus
    };

    // If admin, use getAllMarketingOrders. Otherwise, use getMarketerOrders
    let orders;
    if (req.user.type === 'admin') {
      orders = await marketingOrderService.getAllMarketingOrders(filters);
    } else {
      orders = await marketingOrderService.getMarketerOrders(marketerId, filters);
    }
    
    return sendSuccess(res, orders, 'Marketing orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all marketing orders (admin only)
 */
export const getAllMarketingOrders = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      marketerId: req.query.marketerId
    };

    const orders = await marketingOrderService.getAllMarketingOrders(filters);
    return sendSuccess(res, orders, 'All marketing orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const marketerId = req.user.type === 'admin' ? null : req.user.id;

    const order = await marketingOrderService.getOrderById(id, marketerId);
    return sendSuccess(res, order, 'Marketing order retrieved successfully');
  } catch (error) {
    if (error.message === 'Order not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Update order status (admin only)
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 'Status is required', 400);
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 'Invalid status', 400);
    }

    const order = await marketingOrderService.updateOrderStatus(id, status);
    return sendSuccess(res, order, 'Order status updated successfully');
  } catch (error) {
    if (error.message === 'Order not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

