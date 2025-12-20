import express from 'express';
import userRoutes from './userRoutes.js';
import governmentRoutes from './governmentRoutes.js';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';
import followRoutes from './followRoutes.js';
import cartRoutes from './cartRoutes.js';
import favoriteRoutes from './favoriteRoutes.js';
import walletRoutes from './walletRoutes.js';
import orderRoutes from './orderRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import subcategoryRoutes from './subcategoryRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import vendorRoutes from './vendorRoutes.js';
import liveStreamRoutes from './liveStreamRoutes.js';
import cityRoutes from './cityRoutes.js';
import shippingRoutes from './shippingRoutes.js';
import walletRequestRoutes from './walletRequestRoutes.js';
import walletInfoRoutes from './walletInfoRoutes.js';
import marketplaceProductRoutes from './marketplaceProductRoutes.js';
import marketingProductRoutes from './marketingProductRoutes.js';
import marketingCartRoutes from './marketingCartRoutes.js';
import marketingOrderRoutes from './marketingOrderRoutes.js';
import appSettingsRoutes from './appSettingsRoutes.js';
import affiliateRoutes from './affiliateRoutes.js';
import { config } from '../config/app.js';

const router = express.Router();

// Health check route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    version: '1.0.0'
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/governments', governmentRoutes);
router.use('/products', productRoutes);
router.use('/follows', followRoutes);
router.use('/cart', cartRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/wallet', walletRoutes);
router.use('/orders', orderRoutes);
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/vendors', vendorRoutes);
router.use('/live-streams', liveStreamRoutes);
router.use('/cities', cityRoutes);
router.use('/shippings', shippingRoutes);
router.use('/wallet-requests', walletRequestRoutes);
router.use('/wallet-info', walletInfoRoutes);
router.use('/marketplace-products', marketplaceProductRoutes);
router.use('/marketing-products', marketingProductRoutes);
router.use('/marketing-cart', marketingCartRoutes);
router.use('/marketing-orders', marketingOrderRoutes);
router.use('/app-settings', appSettingsRoutes);
router.use('/affiliates', affiliateRoutes);

export default router;

