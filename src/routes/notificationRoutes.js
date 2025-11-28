import express from 'express';
import {
  saveFCMToken,
  removeFCMToken,
  sendNotificationToMe,
  sendNotificationToUser,
  sendNotificationToUsers,
  sendNotificationToUserType,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationById,
  getAllNotifications,
  deleteNotificationAdmin
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User routes (all authenticated users)
router.post('/token', saveFCMToken);
router.delete('/token', removeFCMToken);
router.post('/send-to-me', sendNotificationToMe);

// Notification retrieval routes (all authenticated users)
router.get('/my-notifications', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.get('/:id', getNotificationById);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// Admin only routes
router.use(authorize('admin'));
router.get('/', getAllNotifications); // Admin: Get all notifications with pagination
router.post('/send-to-user/:userId', sendNotificationToUser);
router.post('/send-to-users', sendNotificationToUsers);
router.post('/send-to-user-type', sendNotificationToUserType);
router.delete('/delete/:id', deleteNotificationAdmin); // Admin: Delete any notification

export default router;






