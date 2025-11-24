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

    return sendSuccess(res, result, 'Notification sent successfully');
  } catch (error) {
    if (error.message === 'User not found' ||
        error.message === 'User does not have an FCM token' ||
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
        error.message === 'User does not have an FCM token' ||
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




