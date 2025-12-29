import { Op } from 'sequelize';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import Government from '../models/Government.js';
import Cart from '../models/Cart.js';
import walletService from './walletService.js';
import cartService from './cartService.js';
import notificationService from './notificationService.js';
import shippingService from './shippingService.js';
class OrderService {
  async createOrder(userId, cartItems, toCityId, shippingAddress, phone, paymentMethod = 'wallet') {
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Group items by vendor and get vendor cityId
    const vendorGroups = {};
    const vendorCityMap = {}; // Map vendorId to cityId
    let totalAmount = 0;

    for (const cartItem of cartItems) {
      const product = await Product.findByPk(cartItem.productId, {
        include: [{ 
          model: User, 
          as: 'vendor',
          attributes: ['id', 'name', 'cityId']
        }]
      });

      if (!product) {
        throw new Error(`Product ${cartItem.productId} not found`);
      }

      if (!product.vendorId) {
        throw new Error(`Product ${cartItem.productId} has no vendor`);
      }

      if (!product.vendor || !product.vendor.cityId) {
        throw new Error(`Vendor for product ${cartItem.productId} has no city. Please update vendor profile with city.`);
      }

      const vendorId = product.vendorId;
      const vendorCityId = product.vendor.cityId;

      // Store vendor cityId
      if (!vendorCityMap[vendorId]) {
        vendorCityMap[vendorId] = vendorCityId;
      }

      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = [];
      }

      const price = product.price && product.isPrice ? parseFloat(product.price) : 0;
      const discount = product.discount || 0;
      const discountedPrice = price * (1 - discount / 100);
      const subtotal = discountedPrice * cartItem.quantity;

      vendorGroups[vendorId].push({
        productId: product.id,
        quantity: cartItem.quantity,
        price: discountedPrice,
        subtotal
      });

      totalAmount += subtotal;
    }

    // Create orders for each vendor
    const orders = [];

    for (const [vendorId, items] of Object.entries(vendorGroups)) {
      // Get vendor's cityId (fromCityId)
      const fromCityId = vendorCityMap[vendorId];
      
      if (!fromCityId) {
        throw new Error(`Vendor ${vendorId} has no city. Please update vendor profile with city.`);
      }

      // Get shipping price for this vendor
      let shippingPrice = 0;
      if (fromCityId && toCityId) {
        try {
          const shipping = await shippingService.getShippingPrice(fromCityId, toCityId);
          shippingPrice = parseFloat(shipping.price);
        } catch (error) {
          // If shipping price not found, use 0 or throw error
          throw new Error(`Shipping price not found from city ${fromCityId} to city ${toCityId}`);
        }
      }

      // Calculate vendor total (products + shipping)
      const productsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const vendorTotal = productsTotal + shippingPrice;

      // Handle payment based on payment method
      let paymentStatus = 'pending';
      let remainingAmount = 0;

      if (paymentMethod === 'cash') {
        // Cash payment: status is paid (will pay on delivery)
        paymentStatus = 'paid';
        remainingAmount = 0;
      } else if (paymentMethod === 'wallet') {
        // Check wallet balance first
        const walletBalance = await walletService.getBalance(userId);
        
        // If wallet balance is 0, throw error
        if (walletBalance <= 0) {
          throw new Error('Wallet balance is zero. Please add funds to your wallet or use cash payment.');
        }
        
        // Wallet payment: deduct what's available (partial payment allowed)
        const { deducted, remaining } = await walletService.deductBalancePartial(
          userId, 
          vendorTotal,
          `دفع طلب رقم #${vendorId}`,
          null, // orderId will be set after order creation
          'order'
        );
        
        if (remaining > 0) {
          // Partial payment: some amount remaining
          paymentStatus = 'remaining';
          remainingAmount = remaining;
        } else {
          // Full payment: all amount deducted
          paymentStatus = 'paid';
          remainingAmount = 0;
        }
      }

      // Create order
      const order = await Order.create({
        userId,
        vendorId: parseInt(vendorId),
        status: 'pending',
        total: vendorTotal,
        fromCityId,
        toCityId,
        shippingPrice,
        shippingAddress,
        phone,
        paymentMethod,
        paymentStatus,
        remainingAmount
      });

      // Update wallet transaction with order reference if payment was made
      if (paymentMethod === 'wallet' && deducted > 0) {
        const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
        await WalletTransaction.update(
          { referenceId: order.id },
          {
            where: {
              userId,
              type: 'payment',
              referenceId: null,
              createdAt: {
                [Op.gte]: new Date(Date.now() - 5000) // Last 5 seconds
              }
            },
            order: [['createdAt', 'DESC']],
            limit: 1
          }
        );
      }

      // Create order items
      for (const item of items) {
        await OrderItem.create({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal
        });
      }

      const orderData = await this.getOrderById(order.id);
      orders.push(orderData);

      // Notify vendor about new order
      try {
        const user = await User.findByPk(userId);
        await notificationService.notifyVendorNewOrder(
          parseInt(vendorId),
          order.id,
          user?.name || 'Customer',
          vendorTotal
        );
      } catch (error) {
        console.error('Failed to notify vendor about new order:', error.message);
      }
    }

    // Notify user about order creation
    try {
      const totalOrderAmount = orders.reduce((sum, order) => sum + order.total, 0);
      await notificationService.notifyOrderCreated(userId, orders[0]?.id || 0, totalOrderAmount);
    } catch (error) {
      console.error('Failed to notify user about order creation:', error.message);
    }

    // Clear cart after order creation
    await cartService.clearCart(userId);

    return orders;
  }

  async getOrderById(orderId) {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'vendor',
          attributes: { exclude: ['password', 'verificationCode', 'verificationCodeExpiry'] },
          include: [
            {
              model: Government,
              as: 'government',
              attributes: ['id', 'name', 'code']
            },
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const orderItems = await OrderItem.findAll({
      where: { orderId: order.id },
      include: [{
        model: Product,
        as: 'product',
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['id', 'name']
          }
        ]
      }]
    });

    // Transform vendor images if needed
    const orderData = order.toJSON();
    if (orderData.vendor) {
      // Transform image URLs if they exist
      if (orderData.vendor.logoImage && !orderData.vendor.logoImage.startsWith('http')) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        orderData.vendor.logoImage = orderData.vendor.logoImage.startsWith('/files/') 
          ? `${baseUrl}${orderData.vendor.logoImage}`
          : `${baseUrl}/files/${orderData.vendor.logoImage}`;
      }
      if (orderData.vendor.backgroundImage && !orderData.vendor.backgroundImage.startsWith('http')) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        orderData.vendor.backgroundImage = orderData.vendor.backgroundImage.startsWith('/files/') 
          ? `${baseUrl}${orderData.vendor.backgroundImage}`
          : `${baseUrl}/files/${orderData.vendor.backgroundImage}`;
      }
      
      // Add whatsapp field (alias for whatsappNumber)
      if (orderData.vendor.whatsappNumber) {
        orderData.vendor.whatsapp = orderData.vendor.whatsappNumber;
      }
    }

    return {
      ...orderData,
      items: orderItems
    };
  }

  async getUserOrders(userId, options = {}) {
    const {
      status = null,
      limit = 50,
      offset = 0
    } = options;

    // Build where clause
    const whereClause = { userId };
    if (status) {
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (validStatuses.includes(status)) {
        whereClause.status = status;
      }
    }

    // Get total count for pagination
    const totalCount = await Order.count({ where: whereClause });

    // Get orders with pagination
    const orders = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await OrderItem.findAll({
          where: { orderId: order.id },
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'images']
          }]
        });

        return {
          ...order.toJSON(),
          items: orderItems
        };
      })
    );

    return {
      orders: ordersWithItems,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + ordersWithItems.length < totalCount
      }
    };
  }

  async getVendorOrders(vendorId, options = {}) {
    const {
      status = null,
      limit = 50,
      offset = 0
    } = options;

    // Build where clause
    const whereClause = { vendorId };
    if (status) {
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (validStatuses.includes(status)) {
        whereClause.status = status;
      }
    }

    // Get total count for pagination
    const totalCount = await Order.count({ where: whereClause });

    // Get orders with pagination
    const orders = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await OrderItem.findAll({
          where: { orderId: order.id },
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'images']
          }]
        });

        return {
          ...order.toJSON(),
          items: orderItems
        };
      })
    );

    return {
      orders: ordersWithItems,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + ordersWithItems.length < totalCount
      }
    };
  }

  async updateOrderStatus(orderId, status, currentUser) {
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Only vendor or admin can update order status
    if (currentUser.type !== 'admin' && currentUser.id !== order.vendorId) {
      throw new Error('Unauthorized to update this order');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid order status');
    }

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    // Notify user about status change
    try {
      await notificationService.notifyOrderStatusChanged(order.userId, order.id, status);
      
      // Special notifications for delivered status
      if (status === 'delivered') {
        await notificationService.notifyOrderDelivered(order.userId, order.id);
        // Notify vendor about payment (if applicable)
        if (order.paymentStatus === 'paid') {
          await notificationService.notifyPaymentReceived(order.vendorId, order.id, order.total);
        }
      }
    } catch (error) {
      console.error('Failed to send order status notification:', error.message);
    }

    return await this.getOrderById(order.id);
  }

  async cancelOrder(orderId, userId) {
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.userId !== userId) {
      throw new Error('Unauthorized to cancel this order');
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      throw new Error('Cannot cancel this order');
    }

    // If paid with wallet, refund (only the paid amount, not remaining)
    if (order.paymentMethod === 'wallet') {
      if (order.paymentStatus === 'paid') {
        // Full refund
        await walletService.addBalance(userId, order.total);
        order.paymentStatus = 'refunded';
      } else if (order.paymentStatus === 'remaining') {
        // Partial refund (only what was deducted)
        const paidAmount = order.total - (order.remainingAmount || 0);
        if (paidAmount > 0) {
          await walletService.addBalance(userId, paidAmount);
        }
        order.paymentStatus = 'refunded';
        order.remainingAmount = order.total; // All amount is now remaining
      }
    }

    order.status = 'cancelled';
    await order.save();

    // Notify user about cancellation
    try {
      await notificationService.notifyOrderCancelled(order.userId, order.id, 'Cancelled by user');
    } catch (error) {
      console.error('Failed to send order cancellation notification:', error.message);
    }

    return await this.getOrderById(order.id);
  }

  /**
   * Calculate full order price (products + shipping) for cart items
   * @param {number} userId - User ID
   * @param {number} toCityId - Destination city ID
   * @returns {Promise<Object>} Order price breakdown
   */
  async calculateOrderPrice(userId, toCityId) {
    if (!toCityId) {
      throw new Error('To city ID is required');
    }

    // Get cart items
    const cartItems = await cartService.getCart(userId);
    
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Group items by vendor and calculate totals
    const vendorGroups = {};
    const vendorCityMap = {};
    let productsTotal = 0;

    for (const cartItem of cartItems) {
      const product = await Product.findByPk(cartItem.productId, {
        include: [{ 
          model: User, 
          as: 'vendor',
          attributes: ['id', 'name', 'cityId']
        }]
      });

      if (!product) {
        throw new Error(`Product ${cartItem.productId} not found`);
      }

      if (!product.vendorId) {
        throw new Error(`Product ${cartItem.productId} has no vendor`);
      }

      if (!product.vendor || !product.vendor.cityId) {
        throw new Error(`Vendor for product ${cartItem.productId} has no city. Please update vendor profile with city.`);
      }

      const vendorId = product.vendorId;
      const vendorCityId = product.vendor.cityId;

      // Store vendor cityId
      if (!vendorCityMap[vendorId]) {
        vendorCityMap[vendorId] = vendorCityId;
      }

      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = {
          vendorId: vendorId,
          vendorName: product.vendor.name,
          fromCityId: vendorCityId,
          items: [],
          productsSubtotal: 0
        };
      }

      const price = product.price && product.isPrice ? parseFloat(product.price) : 0;
      const discount = product.discount || 0;
      const discountedPrice = price * (1 - discount / 100);
      const subtotal = discountedPrice * cartItem.quantity;

      vendorGroups[vendorId].items.push({
        productId: product.id,
        productName: product.name,
        quantity: cartItem.quantity,
        price: discountedPrice,
        subtotal
      });

      vendorGroups[vendorId].productsSubtotal += subtotal;
      productsTotal += subtotal;
    }

    // Calculate shipping for each vendor
    const vendorsBreakdown = [];
    let totalShippingPrice = 0;

    for (const [vendorId, vendorData] of Object.entries(vendorGroups)) {
      const fromCityId = vendorData.fromCityId;
      
      // Get shipping price
      let shippingPrice = 0;
      let shippingInfo = null;
      
      if (fromCityId && toCityId) {
        try {
          const shipping = await shippingService.getShippingPrice(fromCityId, toCityId);
          shippingPrice = parseFloat(shipping.price);
          shippingInfo = {
            fromCity: shipping.fromCity,
            toCity: shipping.toCity,
            price: shippingPrice
          };
        } catch (error) {
          // If shipping price not found, shippingPrice remains 0
          shippingInfo = {
            fromCity: null,
            toCity: null,
            price: 0,
            error: 'Shipping price not found for this route'
          };
        }
      }

      const vendorTotal = vendorData.productsSubtotal + shippingPrice;
      totalShippingPrice += shippingPrice;

      vendorsBreakdown.push({
        vendorId: parseInt(vendorId),
        vendorName: vendorData.vendorName,
        fromCityId: fromCityId,
        toCityId: toCityId,
        productsSubtotal: vendorData.productsSubtotal,
        shippingPrice: shippingPrice,
        shippingInfo: shippingInfo,
        vendorTotal: vendorTotal,
        items: vendorData.items
      });
    }

    const grandTotal = productsTotal + totalShippingPrice;

    // Get wallet balance
    let walletBalance = 0;
    try {
      walletBalance = await walletService.getBalance(userId);
    } catch (error) {
      console.error('Failed to get wallet balance:', error.message);
    }

    return {
      productsTotal,
      totalShippingPrice,
      grandTotal,
      toCityId: parseInt(toCityId),
      vendorsBreakdown,
      wallet: {
        balance: walletBalance,
        canPayWithWallet: walletBalance > 0,
        sufficientBalance: walletBalance >= grandTotal,
        remainingAfterPayment: Math.max(0, walletBalance - grandTotal),
        needsAdditionalPayment: grandTotal > walletBalance ? grandTotal - walletBalance : 0
      }
    };
  }
}

export default new OrderService();

