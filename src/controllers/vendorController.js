import vendorService from '../services/vendorService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Update vendor profile
 * Supports multipart/form-data for file uploads (logoImage, backgroundImage)
 */
export const updateVendorProfile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const vendor = await vendorService.updateVendorProfile(
            id,
            req.body,
            req.files,
            req.user
        );

        return sendSuccess(res, vendor, 'Vendor profile updated successfully');
    } catch (error) {
        if (error.message === 'Vendor not found') {
            return sendError(res, error.message, 404);
        }
        if (error.message === 'User is not a vendor') {
            return sendError(res, error.message, 400);
        }
        if (error.message === 'Unauthorized to update this vendor') {
            return sendError(res, error.message, 403);
        }
        if (error.name === 'SequelizeValidationError') {
            return sendError(res, error.errors[0].message, 400);
        }
        next(error);
    }
};

/**
 * Get current authenticated vendor profile
 */
export const getCurrentVendorProfile = async (req, res, next) => {
    try {
        // Use ID from authenticated user
        const id = req.user.id;
        const vendor = await vendorService.getVendorProfile(id);

        return sendSuccess(res, vendor, 'Vendor profile retrieved successfully');
    } catch (error) {
        if (error.message === 'Vendor not found') {
            return sendError(res, error.message, 404);
        }
        if (error.message === 'User is not a vendor') {
            return sendError(res, error.message, 400);
        }
        next(error);
    }
};

/**
 * Update current authenticated vendor profile
 */
export const updateCurrentVendorProfile = async (req, res, next) => {
    try {
        // Use ID from authenticated user
        const id = req.user.id;

        const vendor = await vendorService.updateVendorProfile(
            id,
            req.body,
            req.files,
            req.user
        );

        return sendSuccess(res, vendor, 'Vendor profile updated successfully');
    } catch (error) {
        if (error.message === 'Vendor not found') {
            return sendError(res, error.message, 404);
        }
        if (error.message === 'User is not a vendor') {
            return sendError(res, error.message, 400);
        }
        if (error.message === 'Unauthorized to update this vendor') {
            return sendError(res, error.message, 403);
        }
        if (error.name === 'SequelizeValidationError') {
            return sendError(res, error.errors[0].message, 400);
        }
        next(error);
    }
};

/**
 * Get vendor profile by ID
 * If user is authenticated, includes isFollowing status
 */
export const getVendorProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user ? req.user.id : null;
        const vendor = await vendorService.getVendorProfile(id, currentUserId);

        return sendSuccess(res, vendor, 'Vendor profile retrieved successfully');
    } catch (error) {
        if (error.message === 'Vendor not found') {
            return sendError(res, error.message, 404);
        }
        if (error.message === 'User is not a vendor') {
            return sendError(res, error.message, 400);
        }
        next(error);
    }
};

/**
 * Get all vendors with optional filters
 * Query params: categoryId, governmentId, search, page, limit
 */
export const getAllVendors = async (req, res, next) => {
    try {
        const filters = {
            categoryId: req.query.categoryId,
            governmentId: req.query.governmentId,
            search: req.query.search,
            page: req.query.page || 1,
            limit: req.query.limit || 10
        };

        // userType parameter is ignored since this endpoint always returns vendors
        // But we'll accept it for compatibility with frontend

        const result = await vendorService.getAllVendors(filters);

        return sendSuccess(res, result, 'Vendors retrieved successfully');
    } catch (error) {
        console.error('Error in getAllVendors:', error);
        next(error);
    }
};

/**
 * Get vendor dashboard statistics
 */
export const getVendorDashboard = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return sendError(res, 'User not authenticated', 401);
        }
        
        const vendorId = req.user.id;
        console.log('Getting dashboard for vendor:', vendorId, 'Type:', req.user.type);
        const dashboard = await vendorService.getVendorDashboard(vendorId);

        return sendSuccess(res, dashboard, 'Vendor dashboard retrieved successfully');
    } catch (error) {
        console.error('Error in getVendorDashboard:', error.message);
        if (error.message === 'User not found' || error.message.includes('not a vendor')) {
            return sendError(res, error.message, 404);
        }
        next(error);
    }
};

/**
 * Get vendor revenue with date filtering
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD)
 */
// Temporary debug endpoint for discounts
export const debugVendorDiscounts = async (req, res, next) => {
    try {
        const vendorId = req.user?.id || 10; // Default to vendor 10
        const productId = req.query.productId || 12; // Default to product 12
        
        // Import models
        const { Discount, DiscountProduct, Product } = await import('../models/index.js');
        const { Op } = await import('sequelize');
        
        const now = new Date();
        
        // Get all active discounts for this vendor
        const vendorDiscounts = await Discount.findAll({
            where: {
                vendorId,
                isActive: true,
                startDate: { [Op.lte]: now },
                endDate: { [Op.gte]: now }
            },
            include: [{
                model: DiscountProduct,
                as: 'discountProducts',
                where: { productId },
                required: false
            }],
            raw: false
        });
        
        // Get product details
        const product = await Product.findByPk(productId, {
            attributes: ['id', 'name', 'price', 'discount', 'vendorId']
        });
        
        // Check if product is in any active discount
        const activeDiscountProduct = await DiscountProduct.findOne({
            where: { productId },
            include: [{
                model: Discount,
                as: 'discount',
                where: {
                    isActive: true,
                    startDate: { [Op.lte]: now },
                    endDate: { [Op.gte]: now }
                },
                required: true
            }]
        });
        
        return sendSuccess(res, {
            currentTime: now,
            product: product ? product.toJSON() : null,
            vendorDiscounts: vendorDiscounts.map(d => ({
                id: d.id,
                title: d.title,
                discount: d.discount,
                startDate: d.startDate,
                endDate: d.endDate,
                hasProduct: d.discountProducts?.some(dp => dp.productId === parseInt(productId))
            })),
            activeDiscountForProduct: activeDiscountProduct ? {
                discountId: activeDiscountProduct.discount.id,
                title: activeDiscountProduct.discount.title,
                discountPercentage: activeDiscountProduct.discount.discount,
                startDate: activeDiscountProduct.discount.startDate,
                endDate: activeDiscountProduct.discount.endDate
            } : null
        }, 'Debug discount data retrieved');
    } catch (error) {
        console.error('Debug discount error:', error);
        return sendError(res, error.message, 500);
    }
};

// Temporary debug endpoint
export const debugVendorOrders = async (req, res, next) => {
    try {
        const vendorId = req.user?.id || req.params.vendorId;
        
        // Import Order model
        const { Order } = await import('../models/index.js');
        const { Op } = await import('sequelize');
        
        // Get all orders for this vendor
        const allOrders = await Order.findAll({
            where: { vendorId },
            attributes: ['id', 'total', 'createdAt', 'status', 'paymentStatus'],
            order: [['createdAt', 'DESC']],
            limit: 10,
            raw: true
        });
        
        // Get orders in 2024
        const orders2024 = await Order.findAll({
            where: {
                vendorId,
                createdAt: {
                    [Op.gte]: new Date('2024-01-01'),
                    [Op.lte]: new Date('2024-12-31T23:59:59')
                }
            },
            attributes: ['id', 'total', 'createdAt'],
            raw: true
        });
        
        // Get total revenue for 2024
        const revenue2024 = await Order.sum('total', {
            where: {
                vendorId,
                createdAt: {
                    [Op.gte]: new Date('2024-01-01'),
                    [Op.lte]: new Date('2024-12-31T23:59:59')
                }
            }
        });
        
        return sendSuccess(res, {
            vendorId,
            totalOrders: allOrders.length,
            recentOrders: allOrders,
            orders2024Count: orders2024.length,
            orders2024: orders2024.slice(0, 5),
            revenue2024: revenue2024 || 0
        }, 'Debug data retrieved');
    } catch (error) {
        console.error('Debug error:', error);
        return sendError(res, error.message, 500);
    }
};

export const getVendorFollowers = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return sendError(res, 'User not authenticated', 401);
        }
        
        const vendorId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        
        console.log('Getting followers for vendor:', vendorId, 'Type:', req.user.type);

        const result = await vendorService.getVendorFollowers(
            vendorId,
            parseInt(page),
            parseInt(limit)
        );

        return sendSuccess(res, result, 'Vendor followers retrieved successfully');
    } catch (error) {
        console.error('Error in getVendorFollowers:', error.message);
        if (error.message === 'User not found' || error.message.includes('not a vendor')) {
            return sendError(res, error.message, 404);
        }
        next(error);
    }
};

export const getVendorRevenue = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return sendError(res, 'User not authenticated', 401);
        }
        
        const vendorId = req.user.id;
        const { from, to } = req.query;
        
        console.log('Getting revenue for vendor:', vendorId, 'Type:', req.user.type);

        // Parse dates if provided
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;

        // Validate dates
        if (from && isNaN(fromDate.getTime())) {
            return sendError(res, 'Invalid from date format. Use YYYY-MM-DD', 400);
        }
        if (to && isNaN(toDate.getTime())) {
            return sendError(res, 'Invalid to date format. Use YYYY-MM-DD', 400);
        }
        if (fromDate && toDate && fromDate > toDate) {
            return sendError(res, 'From date must be before or equal to to date', 400);
        }

        const revenue = await vendorService.getVendorRevenue(vendorId, fromDate, toDate);

        return sendSuccess(res, revenue, 'Vendor revenue retrieved successfully');
    } catch (error) {
        console.error('Error in getVendorRevenue:', error.message);
        if (error.message === 'User not found' || error.message.includes('not a vendor')) {
            return sendError(res, error.message, 404);
        }
        next(error);
    }
};

/**
 * Update vendor's canMakeLiveStream permission
 * PUT /api/v1/vendors/:id/can-make-live-stream
 * Body: { canMakeLiveStream: true/false }
 */
export const updateVendorLiveStreamPermission = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { canMakeLiveStream } = req.body;

        // Only admin can update this permission
        if (req.user.type !== 'admin') {
            return sendError(res, 'Only admin can update live stream permission', 403);
        }

        // Validate input
        if (typeof canMakeLiveStream !== 'boolean') {
            return sendError(res, 'canMakeLiveStream must be a boolean value', 400);
        }

        const vendor = await vendorService.updateVendorLiveStreamPermission(
            parseInt(id),
            canMakeLiveStream
        );

        return sendSuccess(res, vendor, 'Live stream permission updated successfully');
    } catch (error) {
        if (error.message === 'Vendor not found') {
            return sendError(res, error.message, 404);
        }
        if (error.message === 'User is not a vendor') {
            return sendError(res, error.message, 400);
        }
        next(error);
    }
};

/**
 * Check if vendor can make live streams
 * GET /api/v1/vendors/:id/can-make-live-stream
 * Returns status 200 in both cases (can or cannot)
 */
export const checkVendorLiveStreamAbility = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await vendorService.checkVendorLiveStreamAbility(parseInt(id));

        return sendSuccess(res, result, 'Live stream ability checked successfully');
    } catch (error) {
        if (error.message === 'Vendor not found') {
            return sendError(res, error.message, 404);
        }
        if (error.message === 'User is not a vendor') {
            return sendError(res, error.message, 400);
        }
        next(error);
    }
};
