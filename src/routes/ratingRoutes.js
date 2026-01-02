import express from 'express';
import {
  rateVendor,
  getVendorRatings,
  getMyRatingForVendor,
  updateRating,
  deleteRating,
  getVendorRatingSummary
} from '../controllers/ratingController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes - no authentication required
// More specific routes first to avoid conflicts
router.get('/vendor/:vendorId/summary', getVendorRatingSummary);
router.get('/vendor/:vendorId', optionalAuthenticate, getVendorRatings);

// Authenticated routes - require authentication
router.use(authenticate);

// Rate a vendor
router.post('/', rateVendor);

// Get user's rating for a vendor (must come before /vendor/:vendorId routes)
router.get('/vendor/:vendorId/my', getMyRatingForVendor);

// Update user's rating for a vendor
router.put('/vendor/:vendorId', updateRating);

// Delete user's rating for a vendor
router.delete('/vendor/:vendorId', deleteRating);

export default router;

