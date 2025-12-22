import { Op } from 'sequelize';
import MarketingOrder from '../models/MarketingOrder.js';
import MarketingOrderItem from '../models/MarketingOrderItem.js';
import MarketingProduct from '../models/MarketingProduct.js';
import MarketingCart from '../models/MarketingCart.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import Government from '../models/Government.js';
import City from '../models/City.js';
import walletService from './walletService.js';
import marketingCartService from './marketingCartService.js';
import notificationService from './notificationService.js';
import shippingService from './shippingService.js';

class MarketingOrderService {
  /**
   * Create order from marketing cart
   */
  async createOrder(marketerId, toCityId, shippingAddress, phone, paymentMethod = 'wallet') {
    // Verify user is a marketer
    const marketer = await User.findByPk(marketerId);
    if (!marketer || marketer.type !== 'marketing') {
      throw new Error('User is not a marketer');
    }

    // Get cart items from marketing cart
    const cartItems = await MarketingCart.findAll({
      where: { marketerId },
      include: [
        {
          model: MarketingProduct,
          as: 'marketingProduct',
          include: [
            {
              model: City,
              as: 'city',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Group items by marketing product location (cityId)
    const locationGroups = {};
    const locationCityMap = {}; // Map location cityId
    let totalAmount = 0;

    for (const cartItem of cartItems) {
      const marketingProduct = cartItem.marketingProduct;

      if (!marketingProduct) {
        throw new Error(`Marketing product ${cartItem.marketingProductId} not found`);
      }

      if (!marketingProduct.isActive) {
        throw new Error(`Marketing product ${cartItem.marketingProductId} is not active`);
      }

      if (!marketingProduct.cityId) {
        throw new Error(`Marketing product ${cartItem.marketingProductId} has no city.`);
      }

      const productCityId = marketingProduct.cityId;

      // Store product cityId
      if (!locationCityMap[productCityId]) {
        locationCityMap[productCityId] = productCityId;
      }

      if (!locationGroups[productCityId]) {
        locationGroups[productCityId] = [];
      }

      const price = marketingProduct.price && marketingProduct.isPrice ? parseFloat(marketingProduct.price) : 0;
      const discount = marketingProduct.discount || 0;
      const discountedPrice = price * (1 - discount / 100);
      const subtotal = discountedPrice * cartItem.quantity;

      locationGroups[productCityId].push({
        marketingProductId: marketingProduct.id,
        quantity: cartItem.quantity,
        price: discountedPrice,
        subtotal,
        cartItemId: cartItem.id // Store cart item ID for later deletion
      });

      totalAmount += subtotal;
    }

    // Create orders for each location (group by city)
    const orders = [];

    for (const [fromCityId, items] of Object.entries(locationGroups)) {
      // Get shipping price
      let shippingPrice = 0;
      if (fromCityId && toCityId) {
        try {
          const shipping = await shippingService.getShippingPrice(fromCityId, toCityId);
          shippingPrice = parseFloat(shipping.price);
        } catch (error) {
          // If shipping price not found, use 0
          console.warn(`Shipping price not found from city ${fromCityId} to city ${toCityId}, using 0`);
        }
      }

      // Calculate location total (products + shipping)
      const productsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const locationTotal = productsTotal + shippingPrice;

      // Handle payment based on payment method
      let paymentStatus = 'pending';
      let remainingAmount = 0;

      if (paymentMethod === 'cash') {
        paymentStatus = 'paid';
        remainingAmount = 0;
      } else if (paymentMethod === 'wallet') {
        // Check wallet balance
        const walletBalance = await walletService.getBalance(marketerId);
        
        if (walletBalance <= 0) {
          throw new Error('Wallet balance is zero. Please add funds to your wallet or use cash payment.');
        }
        
        // Partial payment allowed
        const { deducted, remaining } = await walletService.deductBalancePartial(
          marketerId, 
          locationTotal,
          `دفع طلب تسويق رقم #${fromCityId}`
        );

        if (deducted > 0) {
          paymentStatus = remaining > 0 ? 'remaining' : 'paid';
          remainingAmount = remaining;
        } else {
          paymentStatus = 'pending';
          remainingAmount = locationTotal;
        }
      }

      // Create order
      const order = await MarketingOrder.create({
        marketerId,
        status: 'pending',
        total: locationTotal,
        fromCityId: parseInt(fromCityId),
        toCityId: toCityId ? parseInt(toCityId) : null,
        shippingPrice,
        shippingAddress,
        paymentMethod,
        paymentStatus,
        remainingAmount,
        phone
      });

      // Create order items
      for (const item of items) {
        await MarketingOrderItem.create({
          marketingOrderId: order.id,
          marketingProductId: item.marketingProductId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal
        });
      }

      // Fetch order with relations
      const orderWithRelations = await MarketingOrder.findByPk(order.id, {
        include: [
          {
            model: User,
            as: 'marketer',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ]
      });

      orders.push(orderWithRelations);

      // Send notification to marketer
      try {
        await notificationService.createNotification({
          userId: marketerId,
          title: 'طلب جديد',
          message: `تم إنشاء طلب تسويق رقم #${order.id} بنجاح`,
          type: 'order_created'
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    // Clear all cart items after creating orders
    await MarketingCart.destroy({
      where: { marketerId }
    });

    return orders;
  }

  /**
   * Get all orders for a marketer
   */
  async getMarketerOrders(marketerId, filters = {}) {
    const { status, paymentStatus } = filters;
    const where = { marketerId };

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    const orders = await MarketingOrder.findAll({
      where,
      include: [
        {
          model: User,
          as: 'marketer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: City,
          as: 'fromCity',
          attributes: ['id', 'name']
        },
        {
          model: City,
          as: 'toCity',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get order items for each order
    for (const order of orders) {
      const orderItems = await MarketingOrderItem.findAll({
        where: { marketingOrderId: order.id },
        include: [
          {
            model: MarketingProduct,
            as: 'marketingProduct',
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
          }
        ]
      });
      order.dataValues.items = orderItems;
    }

    return orders;
  }

  /**
   * Get all marketing orders (admin only)
   */
  async getAllMarketingOrders(filters = {}) {
    const { status, paymentStatus, marketerId } = filters;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (marketerId) {
      where.marketerId = marketerId;
    }

    const orders = await MarketingOrder.findAll({
      where,
      include: [
        {
          model: User,
          as: 'marketer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: City,
          as: 'fromCity',
          attributes: ['id', 'name']
        },
        {
          model: City,
          as: 'toCity',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get order items for each order
    for (const order of orders) {
      const orderItems = await MarketingOrderItem.findAll({
        where: { marketingOrderId: order.id },
        include: [
          {
            model: MarketingProduct,
            as: 'marketingProduct',
            attributes: ['id', 'name', 'images'],
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
          }
        ]
      });
      order.dataValues.items = orderItems;
    }

    return orders;
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId, marketerId = null) {
    const where = { id: orderId };
    if (marketerId) {
      where.marketerId = marketerId;
    }

    const order = await MarketingOrder.findOne({
      where,
      include: [
        {
          model: User,
          as: 'marketer',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: City,
          as: 'fromCity',
          attributes: ['id', 'name']
        },
        {
          model: City,
          as: 'toCity',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Get order items
    const orderItems = await MarketingOrderItem.findAll({
      where: { marketingOrderId: order.id },
      include: [
        {
          model: MarketingProduct,
          as: 'marketingProduct',
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
            },
            {
              model: Government,
              as: 'government',
              attributes: ['id', 'name']
            },
            {
              model: City,
              as: 'city',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    order.dataValues.items = orderItems;
    return order;
  }

  /**
   * Update order status (admin only)
   */
  async updateOrderStatus(orderId, status) {
    const order = await MarketingOrder.findByPk(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = status;
    await order.save();

    // Send notification
    try {
      await notificationService.createNotification({
        userId: order.marketerId,
        title: 'تحديث حالة الطلب',
        message: `تم تحديث حالة طلبك رقم #${order.id} إلى ${status}`,
        type: 'order_updated'
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return order;
  }

  /**
   * Calculate order price for marketing cart
   */
  async calculateOrderPrice(marketerId, toCityId) {
    if (!toCityId) {
      throw new Error('To city ID is required');
    }

    // Verify user is a marketer
    const marketer = await User.findByPk(marketerId);
    if (!marketer || marketer.type !== 'marketing') {
      throw new Error('User is not a marketer');
    }

    // Get cart items from marketing cart (same way as createOrder)
    const cartItems = await MarketingCart.findAll({
      where: { marketerId },
      include: [
        {
          model: MarketingProduct,
          as: 'marketingProduct',
          required: true, // Use INNER JOIN to ensure product exists
          include: [
            {
              model: City,
              as: 'city',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
    
    console.log(`[DEBUG] Marketing cart items found: ${cartItems?.length || 0} for marketerId: ${marketerId}`);
    
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Group items by location (cityId) and calculate totals
    const locationGroups = {};
    const locationCityMap = {};
    let productsTotal = 0;

    for (const cartItem of cartItems) {
      const marketingProduct = cartItem.marketingProduct;

      if (!marketingProduct) {
        throw new Error(`Marketing product ${cartItem.marketingProductId} not found`);
      }

      if (!marketingProduct.isActive) {
        throw new Error(`Marketing product ${cartItem.marketingProductId} is not active`);
      }

      if (!marketingProduct.cityId) {
        throw new Error(`Marketing product ${cartItem.marketingProductId} has no city.`);
      }

      const productCityId = marketingProduct.cityId;

      // Store product cityId
      if (!locationCityMap[productCityId]) {
        locationCityMap[productCityId] = productCityId;
      }

      if (!locationGroups[productCityId]) {
        locationGroups[productCityId] = {
          cityId: productCityId,
          cityName: marketingProduct.city?.name || null,
          items: [],
          productsSubtotal: 0
        };
      }

      const price = marketingProduct.price && marketingProduct.isPrice ? parseFloat(marketingProduct.price) : 0;
      const discount = marketingProduct.discount || 0;
      const discountedPrice = price * (1 - discount / 100);
      const subtotal = discountedPrice * cartItem.quantity;

      locationGroups[productCityId].items.push({
        marketingProductId: marketingProduct.id,
        productName: marketingProduct.name,
        quantity: cartItem.quantity,
        price: discountedPrice,
        subtotal
      });

      locationGroups[productCityId].productsSubtotal += subtotal;
      productsTotal += subtotal;
    }

    // Calculate shipping for each location
    const locationsBreakdown = [];
    let totalShippingPrice = 0;

    for (const [cityId, locationData] of Object.entries(locationGroups)) {
      const fromCityId = parseInt(cityId);
      
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
            fromCity: locationData.cityName,
            toCity: null,
            price: 0,
            error: 'Shipping price not found for this route'
          };
        }
      }

      const locationTotal = locationData.productsSubtotal + shippingPrice;
      totalShippingPrice += shippingPrice;

      locationsBreakdown.push({
        cityId: fromCityId,
        cityName: locationData.cityName,
        fromCityId: fromCityId,
        toCityId: toCityId,
        productsSubtotal: locationData.productsSubtotal,
        shippingPrice: shippingPrice,
        shippingInfo: shippingInfo,
        locationTotal: locationTotal,
        items: locationData.items
      });
    }

    const grandTotal = productsTotal + totalShippingPrice;

    // Get wallet balance
    let walletBalance = 0;
    try {
      walletBalance = await walletService.getBalance(marketerId);
    } catch (error) {
      console.error('Failed to get wallet balance:', error.message);
    }

    return {
      productsTotal,
      totalShippingPrice,
      grandTotal,
      toCityId: parseInt(toCityId),
      locationsBreakdown,
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

export default new MarketingOrderService();

