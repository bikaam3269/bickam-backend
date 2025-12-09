import express from 'express';
import {
  createMarketplaceProduct,
  getAllMarketplaceProducts,
  getMarketplaceProductById,
  getPendingMarketplaceProducts,
  approveMarketplaceProduct,
  rejectMarketplaceProduct,
  updateMarketplaceProduct,
  updateProductExpiration,
  deleteMarketplaceProduct,
  getUserMarketplaceProducts,
  getAllMarketplaceProductsAdmin
} from '../controllers/marketplaceProductController.js';
import {
  getDefaultExpirationDays,
  updateDefaultExpirationDays,
  getAllSettings
} from '../controllers/marketplaceSettingsController.js';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes - only approved products
router.get('/', getAllMarketplaceProducts);

// Protected routes (require authentication)
router.use(authenticate);

// User routes - must be before /:id to avoid route conflicts
router.post('/', upload.array('files', 10), createMarketplaceProduct); // Allow up to 10 files (images/videos)
router.get('/my/products', getUserMarketplaceProducts);

// Admin only routes - must be before /:id to avoid route conflicts
router.use(authorize('admin'));
router.get('/admin/all', getAllMarketplaceProductsAdmin);
router.get('/admin/pending', getPendingMarketplaceProducts);
router.get('/admin/settings', getAllSettings);
router.get('/admin/settings/expiration-days', getDefaultExpirationDays);
router.put('/admin/settings/expiration-days', updateDefaultExpirationDays);
router.post('/:id/approve', approveMarketplaceProduct);
router.post('/:id/reject', rejectMarketplaceProduct);
router.put('/:id', updateMarketplaceProduct);
router.put('/:id/expiration', updateProductExpiration);

// User routes (after admin routes to avoid conflicts)
router.get('/:id', getMarketplaceProductById);
router.delete('/:id', deleteMarketplaceProduct);

export default router;

