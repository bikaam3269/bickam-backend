import express from 'express';
import {
  getAllMarketingProducts,
  getMarketingProductById,
  createMarketingProduct,
  updateMarketingProduct,
  deleteMarketingProduct
} from '../controllers/marketingProductController.js';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getAllMarketingProducts);
router.get('/:id', optionalAuthenticate, getMarketingProductById);

// Admin only routes (require authentication and admin role)
router.use(authenticate);
router.use(authorize('admin'));

router.post('/', upload.array('images', 5), createMarketingProduct);
router.put('/:id', upload.array('images', 5), updateMarketingProduct);
router.delete('/:id', deleteMarketingProduct);

export default router;

