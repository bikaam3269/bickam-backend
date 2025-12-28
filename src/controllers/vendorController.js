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

        const result = await vendorService.getAllVendors(filters);

        return sendSuccess(res, result, 'Vendors retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get vendor dashboard statistics
 * Returns stats, charts data, and recent orders
 */
export const getVendorDashboardStats = async (req, res, next) => {
    try {
        const vendorId = req.user.id;

        // Check if user is a vendor
        if (req.user.type !== 'vendor') {
            return sendError(res, 'Only vendors can access dashboard stats', 403);
        }

        const dashboardData = await vendorService.getVendorDashboardStats(vendorId);

        return sendSuccess(res, dashboardData, 'Dashboard statistics retrieved successfully');
    } catch (error) {
        next(error);
    }
};
