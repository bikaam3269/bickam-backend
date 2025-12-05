import notificationService from '../services/notificationService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Save or update FCM token for authenticated user
 */
export const saveFCMToken = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return sendError(res, 'FCM token is required', 400);
    }

    const result = await notificationService.saveFCMToken(userId, fcmToken);

    return sendSuccess(res, result, 'FCM token saved successfully');
  } catch (error) {
    if (error.message === 'User not found' || 
        error.message === 'User ID and FCM token are required' ||
        error.message === 'Invalid FCM token') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Remove FCM token for authenticated user
 */
export const removeFCMToken = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await notificationService.removeFCMToken(userId);

    return sendSuccess(res, result, 'FCM token removed successfully');
  } catch (error) {
    if (error.message === 'User not found' || 
        error.message === 'User ID is required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Send notification to authenticated user (for testing)
 */
export const sendNotificationToMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, body, data } = req.body;

    if (!title || !body) {
      return sendError(res, 'Title and body are required', 400);
    }

    const result = await notificationService.sendNotificationToUser(
      userId,
      title,
      body,
      data || {}
    );

    return sendSuccess(res, result, result.fcmSent ? 'Notification sent successfully' : 'Notification saved successfully');
  } catch (error) {
    if (error.message === 'User not found' ||
        error.message === 'User ID is required' ||
        error.message === 'Title and body are required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Send notification to specific user (Admin only)
 */
export const sendNotificationToUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { title, body, data } = req.body;

    if (!title || !body) {
      return sendError(res, 'Title and body are required', 400);
    }

    const result = await notificationService.sendNotificationToUser(
      parseInt(userId),
      title,
      body,
      data || {}
    );

    return sendSuccess(res, result, 'Notification sent successfully');
  } catch (error) {
    if (error.message === 'User not found' ||
        error.message === 'User ID is required' ||
        error.message === 'Title and body are required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Send notification to multiple users (Admin only)
 */
export const sendNotificationToUsers = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const { title, body, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return sendError(res, 'User IDs array is required', 400);
    }

    if (!title || !body) {
      return sendError(res, 'Title and body are required', 400);
    }

    const result = await notificationService.sendNotificationToUsers(
      userIds,
      title,
      body,
      data || {}
    );

    return sendSuccess(res, result, 'Notifications sent successfully');
  } catch (error) {
    if (error.message === 'User IDs array is required' ||
        error.message === 'No users with FCM tokens found' ||
        error.message === 'Title and body are required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Send notification to all users of a specific type (Admin only)
 */
export const sendNotificationToUserType = async (req, res, next) => {
  try {
    const { userType } = req.body;
    const { title, body, data } = req.body;

    if (!userType || !['user', 'vendor', 'admin'].includes(userType)) {
      return sendError(res, 'Valid user type (user, vendor, admin) is required', 400);
    }

    if (!title || !body) {
      return sendError(res, 'Title and body are required', 400);
    }

    const result = await notificationService.sendNotificationToUserType(
      userType,
      title,
      body,
      data || {}
    );

    return sendSuccess(res, result, 'Notifications sent successfully');
  } catch (error) {
    if (error.message === 'User type is required' ||
        error.message.includes('No') && error.message.includes('with FCM tokens found') ||
        error.message === 'Title and body are required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get all notifications for authenticated user
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, isRead, type } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : null,
      type: type || null
    });

    return sendSuccess(res, result, 'Notifications retrieved successfully');
  } catch (error) {
    if (error.message === 'User ID is required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get unread notifications count for authenticated user
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const count = await notificationService.getUnreadCount(userId);

    return sendSuccess(res, { count }, 'Unread count retrieved successfully');
  } catch (error) {
    if (error.message === 'User ID is required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(parseInt(id), userId);

    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (error) {
    if (error.message === 'Notification ID and User ID are required' ||
        error.message === 'Notification not found') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Mark all notifications as read for authenticated user
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await notificationService.markAllAsRead(userId);

    return sendSuccess(res, result, 'All notifications marked as read');
  } catch (error) {
    if (error.message === 'User ID is required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await notificationService.deleteNotification(parseInt(id), userId);

    return sendSuccess(res, result, 'Notification deleted successfully');
  } catch (error) {
    if (error.message === 'Notification ID and User ID are required' ||
        error.message === 'Notification not found') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get notification by ID
 */
export const getNotificationById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await notificationService.getNotificationById(parseInt(id), userId);

    return sendSuccess(res, notification, 'Notification retrieved successfully');
  } catch (error) {
    if (error.message === 'Notification ID and User ID are required' ||
        error.message === 'Notification not found') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get all notifications (Admin only)
 */
export const getAllNotifications = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, userId, type, isRead, search } = req.query;

    const result = await notificationService.getAllNotifications({
      limit: parseInt(limit),
      offset: parseInt(offset),
      userId: userId ? parseInt(userId) : null,
      type: type || null,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : null,
      search: search || null
    });

    return sendSuccess(res, result, 'Notifications retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get notifications - Admin gets all, regular users get their own
 */
export const getNotifications = async (req, res, next) => {
  try {
    // If user is admin, return all notifications
    if (req.user.type === 'admin') {
      const { limit = 50, offset = 0, userId, type, isRead, search } = req.query;

      const result = await notificationService.getAllNotifications({
        limit: parseInt(limit),
        offset: parseInt(offset),
        userId: userId ? parseInt(userId) : null,
        type: type || null,
        isRead: isRead === 'true' ? true : isRead === 'false' ? false : null,
        search: search || null
      });

      return sendSuccess(res, result, 'Notifications retrieved successfully');
    }

    // For regular users, return their own notifications
    const userId = req.user.id;
    const { limit = 50, offset = 0, isRead, type } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : null,
      type: type || null
    });

    return sendSuccess(res, result, 'Notifications retrieved successfully');
  } catch (error) {
    if (error.message === 'User ID is required') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Delete notification (Admin only)
 */
export const deleteNotificationAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await notificationService.deleteNotificationAdmin(parseInt(id));

    return sendSuccess(res, result, 'Notification deleted successfully');
  } catch (error) {
    if (error.message === 'Notification ID is required' ||
        error.message === 'Notification not found') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};



