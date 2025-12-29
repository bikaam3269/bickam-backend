import express from 'express';
import {
  createOrder,
  getMarketerOrders,
  getAllMarketingOrders,
  getOrderById,
  updateOrderStatus,
  calculateOrderPrice
} from '../controllers/marketingOrderController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Calculate order price (marketer only) - must be before /:id
router.get('/calculate-price', authenticate, calculateOrderPrice);

// Get marketer orders (marketer only) - must be before /:id
router.get('/marketer', authenticate, getMarketerOrders);

// Admin only routes - must be before /:id
router.get('/', authenticate, authorize('admin'), getAllMarketingOrders);

// Create order from cart (marketer only)
router.post('/', authenticate, createOrder);

// Update order status (admin only) - must be before /:id
router.put('/:id/status', authenticate, authorize('admin'), updateOrderStatus);

// Get order by ID (marketer can get their own, admin can get any) - must be last
router.get('/:id', authenticate, getOrderById);

export default router;
