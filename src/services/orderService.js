import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import Cart from '../models/Cart.js';
import walletService from './walletService.js';
import cartService from './cartService.js';

class OrderService {
  async createOrder(userId, cartItems, shippingAddress, paymentMethod = 'wallet') {
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Group items by vendor
    const vendorGroups = {};
    let totalAmount = 0;

    for (const cartItem of cartItems) {
      const product = await Product.findByPk(cartItem.productId, {
        include: [{ model: User, as: 'vendor' }]
      });

      if (!product) {
        throw new Error(`Product ${cartItem.productId} not found`);
      }

      if (!product.vendorId) {
        throw new Error(`Product ${cartItem.productId} has no vendor`);
      }

      const vendorId = product.vendorId;
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
      // Calculate vendor total
      const vendorTotal = items.reduce((sum, item) => sum + item.subtotal, 0);

      // If payment method is wallet, check balance and deduct
      if (paymentMethod === 'wallet') {
        const balance = await walletService.getBalance(userId);
        if (balance < vendorTotal) {
          throw new Error('Insufficient wallet balance');
        }
        await walletService.deductBalance(userId, vendorTotal);
      }

      // Create order
      const order = await Order.create({
        userId,
        vendorId: parseInt(vendorId),
        status: 'pending',
        total: vendorTotal,
        shippingAddress,
        paymentMethod,
        paymentStatus: paymentMethod === 'wallet' ? 'paid' : 'pending'
      });

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

      orders.push(await this.getOrderById(order.id));
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
          attributes: ['id', 'name', 'email', 'phone']
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

    return {
      ...order.toJSON(),
      items: orderItems
    };
  }

  async getUserOrders(userId) {
    const orders = await Order.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
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

    return ordersWithItems;
  }

  async getVendorOrders(vendorId) {
    const orders = await Order.findAll({
      where: { vendorId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']]
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

    return ordersWithItems;
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

    order.status = status;
    await order.save();

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

    // If paid with wallet, refund
    if (order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
      await walletService.addBalance(userId, order.total);
      order.paymentStatus = 'refunded';
    }

    order.status = 'cancelled';
    await order.save();

    return await this.getOrderById(order.id);
  }
}

export default new OrderService();

