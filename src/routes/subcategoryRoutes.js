import express from 'express';
import {
  getAllSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getSubcategoriesByCategory
} from '../controllers/subcategoryController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getAllSubcategories);
router.get('/category/:categoryId', getSubcategoriesByCategory);
router.get('/:id', getSubcategoryById);

// Admin only routes
// router.use(authenticate);
// router.use(authorize('admin'));

router.post('/', upload.single('image'), createSubcategory);
router.put('/:id', upload.single('image'), updateSubcategory);
router.delete('/:id', deleteSubcategory);

export default router;

