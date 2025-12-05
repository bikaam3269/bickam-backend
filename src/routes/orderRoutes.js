import express from 'express';
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getVendorOrders,
  updateOrderStatus,
  cancelOrder,
  calculateOrderPrice
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

router.get('/calculate-price', calculateOrderPrice);
router.post('/', createOrder);
router.get('/my-orders', getUserOrders);
router.get('/vendor-orders', getVendorOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/cancel', cancelOrder);

export default router;

