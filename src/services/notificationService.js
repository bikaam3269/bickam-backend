import { Op } from 'sequelize';
import User from '../models/User.js';
import firebaseService from './firebaseService.js';
import Follow from '../models/Follow.js';

class NotificationService {
  // Notification types
  static NOTIFICATION_TYPES = {
    LOGIN_SUCCESS: 'login_success',
    ORDER_CREATED: 'order_created',
    ORDER_STATUS_CHANGED: 'order_status_changed',
    NEW_FOLLOWER: 'new_follower',
    PRODUCT_FAVORITED: 'product_favorited',
    NEW_PRODUCT: 'new_product',
    ORDER_CANCELLED: 'order_cancelled',
    ORDER_DELIVERED: 'order_delivered',
    PAYMENT_RECEIVED: 'payment_received'
  };
  /**
   * Save or update FCM token for a user
   * @param {number} userId - User ID
   * @param {string} fcmToken - FCM token
   * @returns {Promise<object>}
   */
  async saveFCMToken(userId, fcmToken) {
    if (!userId || !fcmToken) {
      throw new Error('User ID and FCM token are required');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate token
    const isValid = await firebaseService.validateToken(fcmToken);
    if (!isValid) {
      throw new Error('Invalid FCM token');
    }

    user.fcmToken = fcmToken;
    await user.save();

    return {
      message: 'FCM token saved successfully',
      userId: user.id
    };
  }

  /**
   * Remove FCM token for a user
   * @param {number} userId - User ID
   * @returns {Promise<object>}
   */
  async removeFCMToken(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.fcmToken = null;
    await user.save();

    return {
      message: 'FCM token removed successfully',
      userId: user.id
    };
  }

  /**
   * Send notification to a user
   * @param {number} userId - User ID
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data payload
   * @returns {Promise<object>}
   */
  async sendNotificationToUser(userId, title, body, data = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.fcmToken) {
      throw new Error('User does not have an FCM token');
    }

    return await firebaseService.sendNotification(user.fcmToken, title, body, {
      ...data,
      userId: userId.toString()
    });
  }

  /**
   * Send notification to multiple users
   * @param {number[]} userIds - Array of user IDs
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data payload
   * @returns {Promise<object>}
   */
  async sendNotificationToUsers(userIds, title, body, data = {}) {
    if (!userIds || userIds.length === 0) {
      throw new Error('User IDs array is required');
    }

    const users = await User.findAll({
      where: {
        id: userIds,
        fcmToken: { [Op.ne]: null }
      }
    });

    if (users.length === 0) {
      throw new Error('No users with FCM tokens found');
    }

    const fcmTokens = users.map(user => user.fcmToken).filter(Boolean);

    return await firebaseService.sendMulticastNotification(fcmTokens, title, body, {
      ...data
    });
  }

  /**
   * Send notification to all users of a specific type
   * @param {string} userType - User type ('user', 'vendor', 'admin')
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data payload
   * @returns {Promise<object>}
   */
  async sendNotificationToUserType(userType, title, body, data = {}) {
    if (!userType) {
      throw new Error('User type is required');
    }

    const users = await User.findAll({
      where: {
        type: userType,
        fcmToken: { [Op.ne]: null }
      }
    });

    if (users.length === 0) {
      throw new Error(`No ${userType}s with FCM tokens found`);
    }

    const fcmTokens = users.map(user => user.fcmToken).filter(Boolean);

    return await firebaseService.sendMulticastNotification(fcmTokens, title, body, {
      ...data,
      userType
    });
  }

  /**
   * Send notification safely (won't throw errors if user has no token)
   * @param {number} userId - User ID
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data payload
   * @returns {Promise<object|null>}
   */
  async sendNotificationSafely(userId, title, body, data = {}) {
    try {
      return await this.sendNotificationToUser(userId, title, body, data);
    } catch (error) {
      // Don't throw if user has no FCM token or other non-critical errors
      if (error.message === 'User does not have an FCM token' || 
          error.message === 'User not found') {
        console.log(`Notification skipped for user ${userId}: ${error.message}`);
        return null;
      }
      console.error(`Failed to send notification to user ${userId}:`, error.message);
      return null;
    }
  }

  // ==================== ACTION-BASED NOTIFICATION METHODS ====================

  /**
   * Notify user on successful login
   * @param {number} userId - User ID
   * @param {string} userName - User name
   * @returns {Promise<object|null>}
   */
  async notifyLoginSuccess(userId, userName) {
    return await this.sendNotificationSafely(
      userId,
      'Login Successful',
      `Welcome back, ${userName}! You have successfully logged in.`,
      {
        type: NotificationService.NOTIFICATION_TYPES.LOGIN_SUCCESS,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notify user when order is created
   * @param {number} userId - User ID
   * @param {number} orderId - Order ID
   * @param {number} totalAmount - Total order amount
   * @returns {Promise<object|null>}
   */
  async notifyOrderCreated(userId, orderId, totalAmount) {
    return await this.sendNotificationSafely(
      userId,
      'Order Placed Successfully',
      `Your order #${orderId} has been placed. Total: ${totalAmount} EGP`,
      {
        type: NotificationService.NOTIFICATION_TYPES.ORDER_CREATED,
        orderId: orderId.toString(),
        totalAmount: totalAmount.toString(),
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notify vendor when they receive a new order
   * @param {number} vendorId - Vendor ID
   * @param {number} orderId - Order ID
   * @param {string} customerName - Customer name
   * @param {number} totalAmount - Total order amount
   * @returns {Promise<object|null>}
   */
  async notifyVendorNewOrder(vendorId, orderId, customerName, totalAmount) {
    return await this.sendNotificationSafely(
      vendorId,
      'New Order Received',
      `You have a new order #${orderId} from ${customerName}. Amount: ${totalAmount} EGP`,
      {
        type: NotificationService.NOTIFICATION_TYPES.ORDER_CREATED,
        orderId: orderId.toString(),
        customerName,
        totalAmount: totalAmount.toString(),
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notify user when order status changes
   * @param {number} userId - User ID
   * @param {number} orderId - Order ID
   * @param {string} status - New order status
   * @returns {Promise<object|null>}
   */
  async notifyOrderStatusChanged(userId, orderId, status) {
    const statusMessages = {
      'pending': 'Your order is being processed',
      'confirmed': 'Your order has been confirmed',
      'processing': 'Your order is being prepared',
      'shipped': 'Your order has been shipped',
      'delivered': 'Your order has been delivered',
      'cancelled': 'Your order has been cancelled'
    };

    const message = statusMessages[status] || `Your order status has been updated to ${status}`;

    return await this.sendNotificationSafely(
      userId,
      'Order Status Updated',
      `Order #${orderId}: ${message}`,
      {
        type: NotificationService.NOTIFICATION_TYPES.ORDER_STATUS_CHANGED,
        orderId: orderId.toString(),
        status,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notify vendor when someone follows them
   * @param {number} vendorId - Vendor ID
   * @param {number} followerId - Follower user ID
   * @param {string} followerName - Follower name
   * @returns {Promise<object|null>}
   */
  async notifyNewFollower(vendorId, followerId, followerName) {
    return await this.sendNotificationSafely(
      vendorId,
      'New Follower',
      `${followerName} started following you`,
      {
        type: NotificationService.NOTIFICATION_TYPES.NEW_FOLLOWER,
        followerId: followerId.toString(),
        followerName,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notify vendor when their product is favorited
   * @param {number} vendorId - Vendor ID
   * @param {number} productId - Product ID
   * @param {string} productName - Product name
   * @param {string} userName - User name who favorited
   * @returns {Promise<object|null>}
   */
  async notifyProductFavorited(vendorId, productId, productName, userName) {
    return await this.sendNotificationSafely(
      vendorId,
      'Product Favorited',
      `${userName} added "${productName}" to their favorites`,
      {
        type: NotificationService.NOTIFICATION_TYPES.PRODUCT_FAVORITED,
        productId: productId.toString(),
        productName,
        userName,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notify all followers when vendor adds a new product
   * @param {number} vendorId - Vendor ID
   * @param {number} productId - Product ID
   * @param {string} productName - Product name
   * @param {string} vendorName - Vendor name
   * @returns {Promise<object>}
   */
  async notifyNewProductToFollowers(vendorId, productId, productName, vendorName) {
    try {
      // Get all followers of this vendor
      const follows = await Follow.findAll({
        where: { followingId: vendorId },
        include: [{
          model: User,
          as: 'follower',
          attributes: ['id', 'fcmToken']
        }]
      });

      if (follows.length === 0) {
        return { success: true, sent: 0, message: 'No followers found' };
      }

      // Filter followers with FCM tokens
      const fcmTokens = follows
        .map(follow => follow.follower?.fcmToken)
        .filter(token => token && token.trim().length > 0);

      if (fcmTokens.length === 0) {
        return { success: true, sent: 0, message: 'No valid FCM tokens found' };
      }

      const result = await firebaseService.sendMulticastNotification(
        fcmTokens,
        'New Product Available',
        `${vendorName} added a new product: ${productName}`,
        {
          type: NotificationService.NOTIFICATION_TYPES.NEW_PRODUCT,
          vendorId: vendorId.toString(),
          productId: productId.toString(),
          productName,
          vendorName,
          timestamp: new Date().toISOString()
        }
      );

      return {
        success: true,
        sent: result.successCount,
        failed: result.failureCount
      };
    } catch (error) {
      console.error('Failed to notify followers about new product:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify vendor when payment is received
   * @param {number} vendorId - Vendor ID
   * @param {number} orderId - Order ID
   * @param {number} amount - Payment amount
   * @returns {Promise<object|null>}
   */
  async notifyPaymentReceived(vendorId, orderId, amount) {
    return await this.sendNotificationSafely(
      vendorId,
      'Payment Received',
      `You received ${amount} EGP for order #${orderId}`,
      {
        type: NotificationService.NOTIFICATION_TYPES.PAYMENT_RECEIVED,
        orderId: orderId.toString(),
        amount: amount.toString(),
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notify user when order is delivered
   * @param {number} userId - User ID
   * @param {number} orderId - Order ID
   * @returns {Promise<object|null>}
   */
  async notifyOrderDelivered(userId, orderId) {
    return await this.sendNotificationSafely(
      userId,
      'Order Delivered',
      `Your order #${orderId} has been delivered. Thank you for your purchase!`,
      {
        type: NotificationService.NOTIFICATION_TYPES.ORDER_DELIVERED,
        orderId: orderId.toString(),
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notify user when order is cancelled
   * @param {number} userId - User ID
   * @param {number} orderId - Order ID
   * @param {string} reason - Cancellation reason (optional)
   * @returns {Promise<object|null>}
   */
  async notifyOrderCancelled(userId, orderId, reason = null) {
    const body = reason 
      ? `Your order #${orderId} has been cancelled. Reason: ${reason}`
      : `Your order #${orderId} has been cancelled`;

    return await this.sendNotificationSafely(
      userId,
      'Order Cancelled',
      body,
      {
        type: NotificationService.NOTIFICATION_TYPES.ORDER_CANCELLED,
        orderId: orderId.toString(),
        reason: reason || '',
        timestamp: new Date().toISOString()
      }
    );
  }
}

export default new NotificationService();

