import express from 'express';
import {
  createOrder,
  getMarketerOrders,
  getOrderById,
  updateOrderStatus
} from '../controllers/marketingOrderController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create order and get marketer orders - only for marketers
router.post('/', (req, res, next) => {
  if (req.user.type !== 'marketing') {
    return res.status(403).json({
      success: false,
      error: { message: 'Only marketers can create marketing orders' }
    });
  }
  next();
}, createOrder);

router.get('/marketer', (req, res, next) => {
  if (req.user.type !== 'marketing') {
    return res.status(403).json({
      success: false,
      error: { message: 'Only marketers can view their orders' }
    });
  }
  next();
}, getMarketerOrders);

// Get order by ID - marketers can see their own, admins can see all
router.get('/:id', getOrderById);

// Update order status - admin only
router.put('/:id/status', authorize('admin'), updateOrderStatus);

export default router;




