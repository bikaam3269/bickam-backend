import express from 'express';
import {
  getAllSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  getSectionProducts
} from '../controllers/productSectionController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes - Get all sections (active only)
router.get('/', getAllSections);

// Get products for a section (public)
router.get('/products', getSectionProducts);

// Get section by ID (public)
router.get('/:id', getSectionById);

// Admin only routes - require authentication and admin authorization
router.use(authenticate);
router.use(authorize('admin'));

// Create section (with image upload)
router.post('/', upload.single('image'), createSection);

// Update section (with optional image upload)
router.put('/:id', upload.single('image'), updateSection);

// Delete section
router.delete('/:id', deleteSection);

// Reorder sections
router.post('/reorder', reorderSections);

export default router;
