import orderService from '../services/orderService.js';
import cartService from '../services/cartService.js';
import marketingOrderService from '../services/marketingOrderService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
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
      const user = await User.findByPk(userId);
      if (!user || !user.phone) {
        return sendError(res, 'Phone number is required. Please provide phone number or update your profile.', 400);
      }
      orderPhone = user.phone;
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
      orderPhone,
      paymentMethod
    );

    // Get wallet balance after order creation
    let walletBalance = 0;
    let walletInfo = null;
    try {
      const walletService = (await import('../services/walletService.js')).default;
      walletBalance = await walletService.getBalance(userId);
      
      // Calculate payment summary
      const totalOrderAmount = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const totalPaid = orders.reduce((sum, order) => {
        if (order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
          return sum + parseFloat(order.total || 0);
        } else if (order.paymentMethod === 'wallet' && order.paymentStatus === 'remaining') {
          const paid = parseFloat(order.total || 0) - parseFloat(order.remainingAmount || 0);
          return sum + paid;
        }
        return sum;
      }, 0);
      const totalRemaining = orders.reduce((sum, order) => sum + parseFloat(order.remainingAmount || 0), 0);

      walletInfo = {
        balance: walletBalance,
        totalOrderAmount: totalOrderAmount,
        totalPaid: totalPaid,
        totalRemaining: totalRemaining,
        remainingAfterPayment: walletBalance
      };
    } catch (error) {
      console.error('Failed to get wallet balance:', error.message);
      walletInfo = {
        balance: 0,
        totalOrderAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        remainingAfterPayment: 0
      };
    }

    const response = {
      orders,
      wallet: walletInfo
    };

    return sendSuccess(res, response, 'Order created successfully', 201);
  } catch (error) {
    if (error.message === 'Cart is empty' || 
        error.message.includes('not found') ||
        error.message.includes('city') ||
        error.message.includes('shipping') ||
        error.message.includes('has no city') ||
        error.message.includes('Wallet balance is zero')) {
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
    const userType = req.user.type;
    const { toCityId } = req.query;

    // Validate required fields
    if (!toCityId) {
      return sendError(res, 'To city ID (delivery city) is required', 400);
    }

    const toCityIdNum = parseInt(toCityId);
    if (isNaN(toCityIdNum) || toCityIdNum <= 0) {
      return sendError(res, 'Invalid to city ID', 400);
    }

    // Check user type and use appropriate cart
    let priceBreakdown;
    if (userType === 'marketing') {
      // Use marketing cart for marketers
      console.log(`[DEBUG] User type is marketing, userId: ${userId}, calculating marketing cart price`);
      priceBreakdown = await marketingOrderService.calculateOrderPrice(userId, toCityIdNum);
    } else {
      // Use regular cart for regular users
      console.log(`[DEBUG] User type is ${userType}, userId: ${userId}, calculating regular cart price`);
      priceBreakdown = await orderService.calculateOrderPrice(userId, toCityIdNum);
    }

    return sendSuccess(res, priceBreakdown, 'Order price calculated successfully');
  } catch (error) {
    if (error.message === 'Cart is empty' || 
        error.message === 'To city ID is required' ||
        error.message === 'User is not a marketer' ||
        error.message.includes('not found') ||
        error.message.includes('city') ||
        error.message.includes('has no city')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

