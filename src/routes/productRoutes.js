import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByVendor,
  getMyProducts,
  approveProduct,
  rejectProduct,
  hideProduct,
  getSimilarProducts
} from '../controllers/productController.js';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/vendor/:vendorId', optionalAuthenticate, getProductsByVendor);
router.get('/:id/similar', optionalAuthenticate, getSimilarProducts);
router.get('/:id', optionalAuthenticate, getProductById);

// Protected routes (require authentication)
router.use(authenticate);

import { upload } from '../middleware/upload.js';
router.get('/my-products', getMyProducts);
router.post('/', upload.array('images', 5), createProduct);
router.put('/:id', upload.array('images', 5), updateProduct);
router.delete('/:id', deleteProduct);

// Admin only routes
router.use(authorize('admin'));
router.post('/:id/approve', approveProduct);
router.post('/:id/reject', rejectProduct);
router.post('/:id/hide', hideProduct);

export default router;

