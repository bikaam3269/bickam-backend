import express from 'express';
import { getDashboardStats, getGovernorates } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

// Get dashboard statistics
router.get('/stats', getDashboardStats);

// Get governorates list
router.get('/governorates', getGovernorates);

export default router;



