import express from 'express';
import {
  followVendor,
  unfollowVendor,
  getFollowers,
  getFollowing,
  getFollowCount,
  checkIsFollowing,
  getVendorStats
} from '../controllers/followController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/vendor/:vendorId/followers', getFollowers);
router.get('/vendor/:vendorId/count', getFollowCount);
router.get('/vendor/:vendorId/stats', getVendorStats);

// Protected routes (require authentication)
router.use(authenticate);

router.post('/vendor/:vendorId/follow', followVendor);
router.delete('/vendor/:vendorId/unfollow', unfollowVendor);
router.get('/following', getFollowing);
router.get('/vendor/:vendorId/check', checkIsFollowing);

export default router;

