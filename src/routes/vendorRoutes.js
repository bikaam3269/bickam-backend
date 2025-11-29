import express from 'express';
import {
    updateVendorProfile,
    getVendorProfile,
    getAllVendors,
    getCurrentVendorProfile,
    updateCurrentVendorProfile
} from '../controllers/vendorController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// 1. Public Routes
router.get('/', getAllVendors);

// 2. Protected Routes - Current Vendor (/me)
// These must come BEFORE /:id routes to avoid "me" being interpreted as an ID
router.get('/me', authenticate, getCurrentVendorProfile);

router.put(
    '/me',
    authenticate,
    upload.fields([
        { name: 'logoImage', maxCount: 1 },
        { name: 'backgroundImage', maxCount: 1 }
    ]),
    updateCurrentVendorProfile
);

// 3. Public Routes - Vendor by ID
router.get('/:id', getVendorProfile);

// 4. Protected Routes - Update Vendor by ID
router.put(
    '/:id',
    authenticate,
    upload.fields([
        { name: 'logoImage', maxCount: 1 },
        { name: 'backgroundImage', maxCount: 1 }
    ]),
    updateVendorProfile
);

export default router;
