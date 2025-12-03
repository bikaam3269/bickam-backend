import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByVendor,
  getMyProducts
} from '../controllers/productController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/vendor/:vendorId', optionalAuthenticate, getProductsByVendor);
router.get('/:id', getProductById);

// Protected routes (require authentication)
router.use(authenticate);

import { upload } from '../middleware/upload.js';
router.get('/my-products', getMyProducts);
router.post('/', upload.array('images', 5), createProduct);
router.put('/:id', upload.array('images', 5), updateProduct);
router.delete('/:id', deleteProduct);

export default router;

