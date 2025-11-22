import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByVendor
} from '../controllers/productController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/vendor/:vendorId', getProductsByVendor);
router.get('/:id', getProductById);

// Protected routes (require authentication)
router.use(authenticate);

import { upload } from '../middleware/upload.js';
router.post('/', upload.array('images', 5), createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;

