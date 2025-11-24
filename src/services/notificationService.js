import { Op } from 'sequelize';
import User from '../models/User.js';
import firebaseService from './firebaseService.js';

class NotificationService {
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
}

export default new NotificationService();

