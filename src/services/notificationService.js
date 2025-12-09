import { Op } from 'sequelize';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
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
    PAYMENT_RECEIVED: 'payment_received',
    WALLET_DEPOSIT_APPROVED: 'wallet_deposit_approved',
    WALLET_WITHDRAWAL_APPROVED: 'wallet_withdrawal_approved',
    WALLET_DEPOSIT_REJECTED: 'wallet_deposit_rejected',
    WALLET_WITHDRAWAL_REJECTED: 'wallet_withdrawal_rejected'
  };
  /**
   * Save or update FCM token for a user
   * Prevents duplicate tokens by removing the token from other users first
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

    // Remove this FCM token from all other users to prevent duplicates
    // Each device should only have one active token per user
    await User.update(
      { fcmToken: null },
      {
        where: {
          fcmToken: fcmToken,
          id: { [Op.ne]: userId }
        }
      }
    );

    // Save token for current user
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

    // Create notification record in database
    const notification = await Notification.create({
      userId,
      title,
      body,
      type: data.type || null,
      data: data || null,
      fcmSent: false,
      sentAt: new Date()
    });

    // Try to send via FCM if token exists
    let fcmResult = null;
    let fcmError = null;

    if (user.fcmToken) {
      try {
        fcmResult = await firebaseService.sendNotification(user.fcmToken, title, body, {
          ...data,
          userId: userId.toString(),
          notificationId: notification.id.toString()
        });
        notification.fcmSent = true;
      } catch (error) {
        fcmError = error.message;
        console.error(`Failed to send FCM notification to user ${userId}:`, error);
      }
    } else {
      fcmError = 'User does not have an FCM token';
    }

    // Update notification with FCM status
    notification.fcmError = fcmError;
    await notification.save();

    // Return result even if FCM token doesn't exist (notification is saved in DB)
    return {
      notificationId: notification.id,
      fcmResult,
      fcmSent: notification.fcmSent,
      message: notification.fcmSent 
        ? 'تم إرسال الإشعار بنجاح' 
        : 'تم حفظ الإشعار ولكن رمز FCM غير متاح'
    };
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
        id: userIds
      }
    });

    if (users.length === 0) {
      throw new Error('No users found');
    }

    // Create notification records for all users
    const notifications = await Notification.bulkCreate(
      users.map(user => ({
        userId: user.id,
        title,
        body,
        type: data.type || null,
        data: data || null,
        fcmSent: false,
        sentAt: new Date()
      }))
    );

    // Get users with FCM tokens
    const usersWithTokens = users.filter(user => user.fcmToken);
    const fcmTokens = usersWithTokens.map(user => user.fcmToken).filter(Boolean);

    let fcmResult = null;
    if (fcmTokens.length > 0) {
      try {
        fcmResult = await firebaseService.sendMulticastNotification(fcmTokens, title, body, {
          ...data
        });

        // Update notifications for users with tokens
        const userIdsWithTokens = usersWithTokens.map(u => u.id);
        await Notification.update(
          { fcmSent: true },
          {
            where: {
              userId: { [Op.in]: userIdsWithTokens },
              id: { [Op.in]: notifications.map(n => n.id) }
            }
          }
        );
      } catch (error) {
        console.error('Failed to send multicast notification:', error);
        // Update error for all notifications
        await Notification.update(
          { fcmError: error.message },
          {
            where: {
              id: { [Op.in]: notifications.map(n => n.id) }
            }
          }
        );
      }
    } else {
      // Update error for all notifications
      await Notification.update(
        { fcmError: 'No users with FCM tokens' },
        {
          where: {
            id: { [Op.in]: notifications.map(n => n.id) }
          }
        }
      );
    }

    return {
      notificationsCreated: notifications.length,
      fcmResult,
      successCount: fcmResult?.successCount || 0,
      failureCount: fcmResult?.failureCount || 0
    };
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
        type: userType
      }
    });

    if (users.length === 0) {
      throw new Error(`No ${userType}s found`);
    }

    // Create notification records for all users
    const notifications = await Notification.bulkCreate(
      users.map(user => ({
        userId: user.id,
        title,
        body,
        type: data.type || null,
        data: { ...data, userType } || null,
        fcmSent: false,
        sentAt: new Date()
      }))
    );

    // Get users with FCM tokens
    const usersWithTokens = users.filter(user => user.fcmToken);
    const fcmTokens = usersWithTokens.map(user => user.fcmToken).filter(Boolean);

    let fcmResult = null;
    if (fcmTokens.length > 0) {
      try {
        fcmResult = await firebaseService.sendMulticastNotification(fcmTokens, title, body, {
          ...data,
          userType
        });

        // Update notifications for users with tokens
        const userIdsWithTokens = usersWithTokens.map(u => u.id);
        await Notification.update(
          { fcmSent: true },
          {
            where: {
              userId: { [Op.in]: userIdsWithTokens },
              id: { [Op.in]: notifications.map(n => n.id) }
            }
          }
        );
      } catch (error) {
        console.error('Failed to send multicast notification:', error);
        // Update error for all notifications
        await Notification.update(
          { fcmError: error.message },
          {
            where: {
              id: { [Op.in]: notifications.map(n => n.id) }
            }
          }
        );
      }
    } else {
      // Update error for all notifications
      await Notification.update(
        { fcmError: 'No users with FCM tokens' },
        {
          where: {
            id: { [Op.in]: notifications.map(n => n.id) }
          }
        }
      );
    }

    return {
      notificationsCreated: notifications.length,
      fcmResult,
      successCount: fcmResult?.successCount || 0,
      failureCount: fcmResult?.failureCount || 0
    };
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
      // Don't throw if user has no FCM token - notification is still saved in DB
      if (error.message === 'User does not have an FCM token') {
        console.log(`FCM notification skipped for user ${userId}, but notification saved in database`);
        // Notification is already saved in DB, just return the notification ID
        const notification = await Notification.findOne({
          where: { userId },
          order: [['createdAt', 'DESC']]
        });
        return notification ? { notificationId: notification.id, fcmSent: false } : null;
      }
      if (error.message === 'User not found') {
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
      'تم تسجيل الدخول بنجاح',
      `مرحباً بعودتك، ${userName}! تم تسجيل دخولك بنجاح.`,
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
      'تم إنشاء الطلب بنجاح',
      `تم إنشاء طلبك رقم #${orderId}. الإجمالي: ${totalAmount} جنيه`,
      {
        type: 'order',
        id: orderId.toString(), // Add id field for action item
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
      'طلب جديد',
      `لديك طلب جديد رقم #${orderId} من ${customerName}. المبلغ: ${totalAmount} جنيه`,
      {
        type: 'order',
        id: orderId.toString(), // Add id field for action item
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
      'pending': 'طلبك قيد المعالجة',
      'confirmed': 'تم تأكيد طلبك',
      'processing': 'طلبك قيد التحضير',
      'shipped': 'تم شحن طلبك',
      'delivered': 'تم تسليم طلبك',
      'cancelled': 'تم إلغاء طلبك'
    };

    const message = statusMessages[status] || `تم تحديث حالة طلبك إلى ${status}`;

    return await this.sendNotificationSafely(
      userId,
      'تم تحديث حالة الطلب',
      `الطلب رقم #${orderId}: ${message}`,
      {
        type: 'order',
        id: orderId.toString(), // Add id field for action item
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
      'متابع جديد',
      `${followerName} بدأ متابعتك`,
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
      'تم إضافة منتج للمفضلة',
      `${userName} أضاف "${productName}" إلى المفضلة`,
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
        return { success: true, sent: 0, message: 'لا يوجد متابعون' };
      }

      // Filter followers with FCM tokens
      const fcmTokens = follows
        .map(follow => follow.follower?.fcmToken)
        .filter(token => token && token.trim().length > 0);

      if (fcmTokens.length === 0) {
        return { success: true, sent: 0, message: 'لا توجد رموز FCM صالحة' };
      }

      const result = await firebaseService.sendMulticastNotification(
        fcmTokens,
        'منتج جديد متاح',
        `${vendorName} أضاف منتجاً جديداً: ${productName}`,
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
      'تم استلام الدفع',
      `تم استلام ${amount} جنيه للطلب رقم #${orderId}`,
      {
        type: 'order',
        id: orderId.toString(), // Add id field for action item
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
      'تم تسليم الطلب',
      `تم تسليم طلبك رقم #${orderId}. شكراً لشرائك!`,
      {
        type: 'order',
        id: orderId.toString(), // Add id field for action item
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
      ? `تم إلغاء طلبك رقم #${orderId}. السبب: ${reason}`
      : `تم إلغاء طلبك رقم #${orderId}`;

    return await this.sendNotificationSafely(
      userId,
      'تم إلغاء الطلب',
      body,
      {
        type: 'order',
        id: orderId.toString(), // Add id field for action item
        orderId: orderId.toString(),
        reason: reason || '',
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notify user when marketplace product is approved
   * @param {number} userId - User ID
   * @param {number} productId - Marketplace product ID
   * @param {string} productName - Product name
   * @returns {Promise<object|null>}
   */
  async notifyMarketplaceProductApproved(userId, productId, productName) {
    return await this.sendNotificationSafely(
      userId,
      'تم قبول منتجك',
      `تم قبول منتجك "${productName}" وهو الآن متاح للعرض`,
      {
        type: 'marketplace_approved',
        id: productId.toString(), // Add id field for action item
        productId: productId.toString(),
        productName,
        timestamp: new Date().toISOString()
      }
    );
  }

  // ==================== NOTIFICATION RETRIEVAL METHODS ====================

  /**
   * Get all notifications for a user
   * @param {number} userId - User ID
   * @param {object} options - Query options (limit, offset, isRead, type)
   * @returns {Promise<object>}
   */
  async getUserNotifications(userId, options = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const {
      limit = 50,
      offset = 0,
      isRead = null,
      type = null
    } = options;

    const where = { userId };

    if (isRead !== null) {
      where.isRead = isRead;
    }

    if (type) {
      where.type = type;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    return {
      notifications: rows,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  }

  /**
   * Get unread notifications count for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>}
   */
  async getUnreadCount(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return await Notification.count({
      where: {
        userId,
        isRead: false
      }
    });
  }

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for security)
   * @returns {Promise<object>}
   */
  async markAsRead(notificationId, userId) {
    if (!notificationId || !userId) {
      throw new Error('Notification ID and User ID are required');
    }

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   * @param {number} userId - User ID
   * @returns {Promise<object>}
   */
  async markAllAsRead(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const [updatedCount] = await Notification.update(
      {
        isRead: true,
        readAt: new Date()
      },
      {
        where: {
          userId,
          isRead: false
        }
      }
    );

    return {
      updatedCount,
      message: `${updatedCount} notifications marked as read`
    };
  }

  /**
   * Delete a notification
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for security)
   * @returns {Promise<object>}
   */
  async deleteNotification(notificationId, userId) {
    if (!notificationId || !userId) {
      throw new Error('Notification ID and User ID are required');
    }

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.destroy();

    return {
      message: 'Notification deleted successfully'
    };
  }

  /**
   * Get notification by ID
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for security)
   * @returns {Promise<object>}
   */
  async getNotificationById(notificationId, userId) {
    if (!notificationId || !userId) {
      throw new Error('Notification ID and User ID are required');
    }

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }

  /**
   * Get all notifications (Admin only)
   * @param {object} options - Query options (limit, offset, userId, type, isRead)
   * @returns {Promise<object>}
   */
  async getAllNotifications(options = {}) {
    const {
      limit = 50,
      offset = 0,
      userId = null,
      type = null,
      isRead = null,
      search = null
    } = options;

    const where = {};

    if (userId) {
      where.userId = userId;
    }

    if (type) {
      where.type = type;
    }

    if (isRead !== null) {
      where.isRead = isRead;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { body: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'type', 'phone']
      }]
    });

    return {
      notifications: rows,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + parseInt(limit)) < count
    };
  }

  /**
   * Delete notification (Admin only - can delete any notification)
   * @param {number} notificationId - Notification ID
   * @returns {Promise<object>}
   */
  async deleteNotificationAdmin(notificationId) {
    if (!notificationId) {
      throw new Error('Notification ID is required');
    }

    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.destroy();

    return {
      message: 'Notification deleted successfully'
    };
  }
}

export default new NotificationService();

