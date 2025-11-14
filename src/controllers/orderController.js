import orderService from '../services/orderService.js';
import cartService from '../services/cartService.js';

export const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, paymentMethod = 'wallet' } = req.body;

    // Get cart items
    const cartItems = await cartService.getCart(userId);

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cart is empty' }
      });
    }

    // Convert cart items to order format
    const orderItems = cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }));

    const orders = await orderService.createOrder(userId, orderItems, shippingAddress, paymentMethod);

    res.status(201).json({
      success: true,
      data: orders
    });
  } catch (error) {
    if (error.message === 'Cart is empty' || 
        error.message === 'Insufficient wallet balance' ||
        error.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(parseInt(id));

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orders = await orderService.getUserOrders(userId);

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorOrders = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const orders = await orderService.getVendorOrders(vendorId);

    res.json({
      success: true,
      data: orders
    });
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
      return res.status(400).json({
        success: false,
        error: { message: 'Status is required' }
      });
    }

    const order = await orderService.updateOrderStatus(parseInt(id), status, currentUser);

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    if (error.message === 'Order not found' || 
        error.message === 'Unauthorized to update this order' ||
        error.message === 'Invalid order status') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await orderService.cancelOrder(parseInt(id), userId);

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    if (error.message === 'Order not found' || 
        error.message === 'Unauthorized to cancel this order' ||
        error.message === 'Cannot cancel this order') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

