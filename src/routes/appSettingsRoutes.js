import express from 'express';
import {
  getAllSettings,
  getSettingById,
  getMainSettings,
  createSettings,
  updateSettings,
  updateMainSettings,
  deleteSettings
} from '../controllers/appSettingsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes - Get main settings (available for all users)
// Must be defined before /:id to avoid route conflicts
router.get('/main', getMainSettings);
router.get('/', getMainSettings);

// Admin only routes - require authentication and admin authorization
router.use(authenticate);
router.use(authorize('admin'));

// Get setting by ID (admin only)
router.get('/:id', getSettingById);

// Create settings
router.post('/', createSettings);

// Update main settings (single app settings)
router.put('/', updateMainSettings);
router.put('/main', updateMainSettings);
router.put('/:id', updateSettings);

// Delete settings
router.delete('/:id', deleteSettings);

export default router;

