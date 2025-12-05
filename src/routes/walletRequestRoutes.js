import express from 'express';
import {
  createDepositRequest,
  createWithdrawalRequest,
  getUserRequests,
  getAllRequests,
  getRequestById,
  approveDepositRequest,
  approveWithdrawalRequest,
  rejectRequest
} from '../controllers/walletRequestController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Admin routes (require authentication and admin role) - must be before /:id
router.get('/', authenticate, authorize('admin'), getAllRequests);
router.put('/:id/approve-deposit', authenticate, authorize('admin'), approveDepositRequest);
router.put('/:id/approve-withdrawal', authenticate, authorize('admin'), upload.single('evidenceImage'), approveWithdrawalRequest);
router.put('/:id/reject', authenticate, authorize('admin'), rejectRequest);

// User routes (require authentication) - must be after admin routes
router.post('/deposit', authenticate, upload.single('evidenceImage'), createDepositRequest);
router.post('/withdrawal', authenticate, createWithdrawalRequest);
router.get('/my-requests', authenticate, getUserRequests);
router.get('/:id', authenticate, getRequestById);

export default router;

