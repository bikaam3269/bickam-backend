import express from 'express';
import {
  getAllWalletInfo,
  getWalletInfoById,
  createWalletInfo,
  updateWalletInfo,
  deleteWalletInfo
} from '../controllers/walletInfoController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - Get active wallet info (for users to see available wallets)
// Must be before /:id route to avoid route conflict
router.get('/active', getAllWalletInfo);

// All routes require authentication
router.use(authenticate);

// Get all wallet info (authenticated users can see all, including inactive)
router.get('/', getAllWalletInfo);

// Get wallet info by ID (must be after /active route)
router.get('/:id', getWalletInfoById);

// Admin only routes
router.use(authorize('admin'));

// Create, update, delete (Admin only)
router.post('/', createWalletInfo);
router.put('/:id', updateWalletInfo);
router.delete('/:id', deleteWalletInfo);

export default router;

