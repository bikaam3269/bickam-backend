import express from 'express';
import {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
} from '../controllers/bannerController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes - users can get banners
router.get('/', getAllBanners);
router.get('/:id', getBannerById);

// Admin only routes
router.use(authenticate);
router.use(authorize('admin'));

router.post('/', upload.single('image'), createBanner);
router.put('/:id', upload.single('image'), updateBanner);
router.delete('/:id', deleteBanner);

export default router;

