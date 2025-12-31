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
