import marketingOrderService from '../services/marketingOrderService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Create order from marketing cart
 */
export const createOrder = async (req, res, next) => {
  try {
    const marketerId = req.user.id;
    const { toCityId, shippingAddress, phone, paymentMethod = 'wallet' } = req.body;

    // Validate required fields
    if (!toCityId) {
      return sendError(res, 'To city ID (delivery city) is required', 400);
    }

    if (!shippingAddress) {
      return sendError(res, 'Shipping address is required', 400);
    }

    // Get user phone if not provided in request
    let orderPhone = phone;
    if (!orderPhone) {
      const User = (await import('../models/User.js')).default;
      const user = await User.findByPk(marketerId);
      if (!user || !user.phone) {
        return sendError(res, 'Phone number is required. Please provide phone number or update your profile.', 400);
      }
      orderPhone = user.phone;
    }

    const orders = await marketingOrderService.createOrder(
      marketerId,
      parseInt(toCityId),
      shippingAddress,
      orderPhone,
      paymentMethod
    );

    return sendSuccess(res, orders, 'Orders created successfully', 201);
  } catch (error) {
    if (error.message === 'User is not a marketer' ||
        error.message === 'Cart is empty' ||
        error.message === 'Wallet balance is zero. Please add funds to your wallet or use cash payment.') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get all orders for authenticated marketer
 */
export const getMarketerOrders = async (req, res, next) => {
  try {
    const marketerId = req.user.id;
    const { status, paymentStatus } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (paymentStatus) filters.paymentStatus = paymentStatus;

    const orders = await marketingOrderService.getMarketerOrders(marketerId, filters);

    return sendSuccess(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all marketing orders (admin only)
 */
export const getAllMarketingOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, marketerId } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (paymentStatus) filters.paymentStatus = paymentStatus;
    if (marketerId) filters.marketerId = parseInt(marketerId);

    const orders = await marketingOrderService.getAllMarketingOrders(filters);

    return sendSuccess(res, orders, 'Orders retrieved successfully');
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
    const marketerId = req.user.type === 'marketing' ? req.user.id : null;

    const order = await marketingOrderService.getOrderById(parseInt(id), marketerId);

    return sendSuccess(res, order, 'Order retrieved successfully');
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

    const order = await marketingOrderService.updateOrderStatus(parseInt(id), status);

    return sendSuccess(res, order, 'Order status updated successfully');
  } catch (error) {
    if (error.message === 'Order not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Calculate order price for marketing cart
 */
export const calculateOrderPrice = async (req, res, next) => {
  try {
    const marketerId = req.user.id;
    const { toCityId } = req.query;

    if (!toCityId) {
      return sendError(res, 'To city ID is required', 400);
    }

    const priceBreakdown = await marketingOrderService.calculateOrderPrice(
      marketerId,
      parseInt(toCityId)
    );

    return sendSuccess(res, priceBreakdown, 'Order price calculated successfully');
  } catch (error) {
    if (error.message === 'User is not a marketer' ||
        error.message === 'Cart is empty' ||
        error.message === 'To city ID is required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};
