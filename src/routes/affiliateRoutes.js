import express from 'express';
import {
  getMarketers,
  getMarketerById
} from '../controllers/affiliateController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All affiliate routes require authentication
router.use(authenticate);

// Get all marketers - Admin only
router.get('/marketers', authorize('admin'), getMarketers);

// Get marketer by ID - Admin only
router.get('/marketers/:id', authorize('admin'), getMarketerById);

export default router;




