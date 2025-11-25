import express from 'express';
import {
  saveFCMToken,
  removeFCMToken,
  sendNotificationToMe,
  sendNotificationToUser,
  sendNotificationToUsers,
  sendNotificationToUserType
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

// Admin only routes
router.use(authorize('admin'));
router.post('/send-to-user/:userId', sendNotificationToUser);
router.post('/send-to-users', sendNotificationToUsers);
router.post('/send-to-user-type', sendNotificationToUserType);

export default router;






