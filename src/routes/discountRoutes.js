import express from 'express';
import {
  createDiscount,
  getMyDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
  checkProductInDiscount,
  getAllActiveDiscounts,
  getDiscountsByVendorId,
  getDiscountDetailsForCustomer
} from '../controllers/discountController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/product/:productId', checkProductInDiscount);
router.get('/all', getAllActiveDiscounts);
router.get('/vendor/:vendorId', getDiscountsByVendorId);
router.get('/:id/details', optionalAuthenticate, getDiscountDetailsForCustomer);

// Vendor-only routes - require authentication and vendor authorization
router.use(authenticate);
router.use((req, res, next) => {
  if (req.user.type !== 'vendor') {
    return res.status(403).json({
      success: false,
      error: { message: 'Only vendors can access discount management routes' }
    });
  }
  next();
});

router.get('/my', getMyDiscounts);
router.post('/', upload.single('image'), createDiscount);
router.get('/:id', getDiscountById);
router.put('/:id', upload.single('image'), updateDiscount);
router.delete('/:id', deleteDiscount);

export default router;

