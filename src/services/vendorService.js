import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/sequelize.js';
import User from '../models/User.js';
import Government from '../models/Government.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Subcategory from '../models/Subcategory.js';
import Order from '../models/Order.js';
import followService from './followService.js';
import favoriteService from './favoriteService.js';
import { config } from '../config/app.js';

// Helper function to construct full image URL
const getImageUrl = (filename) => {
    if (!filename) return null;
    // If already a full URL, return as is
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
        return filename;
    }
    // If starts with /files/, it's already a path, just add base URL
    if (filename.startsWith('/files/')) {
        const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;
        return `${baseUrl}${filename}`;
    }
    // Otherwise, it's just a filename, construct full URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;
    return `${baseUrl}/files/${filename}`;
};

// Helper function to transform vendor data with image URLs
const transformVendorImages = (vendor) => {
    if (!vendor) return vendor;

    const vendorData = vendor.toJSON ? vendor.toJSON() : vendor;

    if (vendorData.logoImage) {
        vendorData.logoImage = getImageUrl(vendorData.logoImage);
    }

    if (vendorData.backgroundImage) {
        vendorData.backgroundImage = getImageUrl(vendorData.backgroundImage);
    }

    return vendorData;
};

// Helper function to get product images as array with full URLs
const getProductImages = async (vendorId) => {
    const products = await Product.findAll({
        where: { vendorId: parseInt(vendorId) },
        attributes: ['images']
    });

    const allImages = [];
    products.forEach(product => {
        const productData = product.toJSON ? product.toJSON() : product;
        let images = productData.images || [];

        // Ensure images is an array
        if (typeof images === 'string') {
            try {
                images = JSON.parse(images);
            } catch (e) {
                images = [];
            }
        }

        if (!Array.isArray(images)) {
            images = [];
        }

        // Convert each image to full URL and add to array
        images.forEach(image => {
            if (image) {
                const fullUrl = getImageUrl(image);
                if (fullUrl) {
                    allImages.push(fullUrl);
                }
            }
        });
    });

    return allImages;
};

class VendorService {
    /**
     * Update vendor profile data
     * Supports updating all vendor-specific fields including images
     */
    async updateVendorProfile(vendorId, data, files, currentUser) {
        // Find the vendor
        const vendor = await User.findByPk(vendorId);

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        // Check if user is a vendor
        if (vendor.type !== 'vendor') {
            throw new Error('User is not a vendor');
        }

        // Authorization: Only the vendor themselves or admin can update
        if (currentUser.id !== parseInt(vendorId) && currentUser.type !== 'admin') {
            throw new Error('Unauthorized to update this vendor');
        }

        // Handle file uploads
        if (files) {
            if (files.logoImage && files.logoImage[0]) {
                data.logoImage = `/files/${files.logoImage[0].filename}`;
            }
            if (files.backgroundImage && files.backgroundImage[0]) {
                data.backgroundImage = `/files/${files.backgroundImage[0].filename}`;
            }
        }

        // If password is being updated, hash it
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }

        // Allowed vendor fields to update
        const allowedFields = [
            'name',
            'email',
            'password',
            'phone',
            'governmentId',
            'activity',
            'description',
            'categoryId',
            'logoImage',
            'backgroundImage',
            'latitude',
            'longitude',
            'whatsappNumber',
            'address'
        ];

        // Filter and update only allowed fields
        const updateData = {};
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                // Handle null values - explicitly set to null
                if (data[field] === null) {
                    // Don't set password to null if empty, just skip it
                    if (field !== 'password') {
                        updateData[field] = null;
                    }
                }
                // Handle empty strings for optional fields - convert to null
                else if (data[field] === '' || data[field] === 'null' || data[field] === 'undefined') {
                    // Don't set password to null if empty, just skip it
                    if (field !== 'password') {
                        updateData[field] = null;
                    }
                } else {
                    updateData[field] = data[field];
                }
            }
        });

        // Update vendor
        await vendor.update(updateData);

        // Fetch updated vendor with associations
        const updatedVendor = await User.findByPk(vendorId, {
            include: [
                {
                    model: Government,
                    as: 'government',
                    attributes: ['id', 'name', 'code']
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                }
            ],
            attributes: { exclude: ['password', 'verificationCode', 'verificationCodeExpiry'] }
        });

        // Transform vendor data with image URLs
        const vendorData = transformVendorImages(updatedVendor);

        // Set isOnline: true if vendor has no address, latitude, or longitude (online store)
        // Otherwise, isOnline: false (physical store)
        vendorData.isOnline = !(vendorData.address && vendorData.latitude && vendorData.longitude);

        return vendorData;
    }

    /**
     * Get vendor profile by ID
     * @param {number|string} vendorId - The vendor ID
     * @param {number|null} currentUserId - The current authenticated user ID (optional)
     */
    async getVendorProfile(vendorId, currentUserId = null) {
        const vendor = await User.findByPk(vendorId, {
            include: [
                {
                    model: Government,
                    as: 'government',
                    attributes: ['id', 'name', 'code']
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                }
            ],
            attributes: { exclude: ['password', 'verificationCode', 'verificationCodeExpiry'] }
        });

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        if (vendor.type !== 'vendor') {
            throw new Error('User is not a vendor');
        }

        // Get followers count
        const followersCount = await followService.getFollowCount(parseInt(vendorId));

        // Check if current user is following this vendor
        let isFollowing = false;
        if (currentUserId) {
            isFollowing = await followService.isFollowing(parseInt(currentUserId), parseInt(vendorId));
        }

        // Check if current user has favorite products from this vendor
        let hasFavoriteProducts = false;
        if (currentUserId) {
            hasFavoriteProducts = await favoriteService.hasFavoriteProductsFromVendor(parseInt(currentUserId), parseInt(vendorId));
        }

        // Get unique subcategories from vendor products
        const vendorProducts = await Product.findAll({
            where: { vendorId: parseInt(vendorId) },
            include: [
                {
                    model: Subcategory,
                    as: 'subcategory',
                    attributes: ['id', 'name']
                }
            ],
            attributes: ['subcategoryId']
        });

        // Extract unique subcategories
        const subcategoriesMap = new Map();
        vendorProducts.forEach(product => {
            if (product.subcategory) {
                subcategoriesMap.set(product.subcategory.id, {
                    id: product.subcategory.id,
                    name: product.subcategory.name
                });
            }
        });
        const subcategories = Array.from(subcategoriesMap.values());

        // Calculate rating from orders
        // Rating based on completed orders vs total orders
        const totalOrders = await Order.count({
            where: { vendorId: parseInt(vendorId) }
        });

        const completedOrders = await Order.count({
            where: {
                vendorId: parseInt(vendorId),
                status: 'delivered'
            }
        });

        // Calculate rating (0-5 scale based on completion rate)
        // If no orders, rating is 0
        let rating = 0;
        if (totalOrders > 0) {
            const completionRate = completedOrders / totalOrders;
            // Convert to 0-5 scale (completion rate * 5)
            rating = parseFloat((completionRate * 5).toFixed(2));
        }

        // Transform vendor data with image URLs
        const vendorData = transformVendorImages(vendor);
        vendorData.followersCount = followersCount;
        vendorData.isFollowing = isFollowing;
        vendorData.hasFavoriteProducts = hasFavoriteProducts;
        vendorData.subcategories = subcategories;
        vendorData.rating = rating;
        vendorData.totalOrders = totalOrders;
        vendorData.completedOrders = completedOrders;

        // Get product images as array
        const productImages = await getProductImages(vendorId);
        vendorData.productImages = productImages;

        // Set isOnline: true if vendor has no address, latitude, or longitude (online store)
        // Otherwise, isOnline: false (physical store)
        vendorData.isOnline = !(vendorData.address && vendorData.latitude && vendorData.longitude);

        return vendorData;
    }

    /**
     * Get all vendors with optional filters
     */
    async getAllVendors(filters = {}) {
        const { categoryId, governmentId, search, page = 1, limit = 10 } = filters;
        const where = { type: 'vendor' };

        if (categoryId) {
            where.categoryId = categoryId;
        }

        if (governmentId) {
            where.governmentId = governmentId;
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { activity: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await User.findAndCountAll({
            where,
            include: [
                {
                    model: Government,
                    as: 'government',
                    attributes: ['id', 'name', 'code']
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                }
            ],
            attributes: { exclude: ['password', 'verificationCode', 'verificationCodeExpiry'] },
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        // Get product images for all vendors
        const vendorsWithStatus = await Promise.all(
            rows.map(async (vendor) => {
                // Transform vendor data with image URLs
                const vendorData = transformVendorImages(vendor);
                // Set isOnline: false if vendor has no address, latitude, or longitude
                // Otherwise, isOnline: true
                vendorData.isOnline = !!(vendorData.address && vendorData.latitude && vendorData.longitude);

                // Get product images as array
                const productImages = await getProductImages(vendor.id);
                vendorData.productImages = productImages;

                return vendorData;
            })
        );

        return {
            vendors: vendorsWithStatus,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get vendor dashboard statistics
     * @param {number} vendorId - The vendor ID
     */
    async getVendorDashboard(vendorId) {
        // Verify vendor exists
        const vendor = await User.findByPk(vendorId);
        if (!vendor) {
            throw new Error('User not found');
        }
        if (vendor.type !== 'vendor') {
            throw new Error(`User is not a vendor (type: ${vendor.type})`);
        }

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get current month date range
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

        // Get total orders count
        const totalOrders = await Order.count({
            where: { vendorId }
        });

        // Get orders by status
        const pendingOrders = await Order.count({
            where: { vendorId, status: 'pending' }
        });

        const completedOrders = await Order.count({
            where: { vendorId, status: 'delivered' }
        });

        // Get total revenue (sum of all orders)
        const totalRevenueResult = await Order.findAll({
            where: { vendorId },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue']
            ],
            raw: true
        });
        const totalRevenue = parseFloat(totalRevenueResult[0]?.totalRevenue || 0);

        // Get today's revenue
        const todayRevenueResult = await Order.findAll({
            where: {
                vendorId,
                createdAt: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'todayRevenue']
            ],
            raw: true
        });
        const todayRevenue = parseFloat(todayRevenueResult[0]?.todayRevenue || 0);

        // Get monthly revenue
        const monthlyRevenueResult = await Order.findAll({
            where: {
                vendorId,
                createdAt: {
                    [Op.gte]: monthStart,
                    [Op.lte]: monthEnd
                }
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'monthlyRevenue']
            ],
            raw: true
        });
        const monthlyRevenue = parseFloat(monthlyRevenueResult[0]?.monthlyRevenue || 0);

        // Get products count
        const totalProducts = await Product.count({
            where: { vendorId }
        });

        // Get active products count
        const activeProducts = await Product.count({
            where: { vendorId, isActive: true }
        });

        // Get followers count
        const totalFollowers = await followService.getFollowCount(vendorId);

        // Get recent orders (last 5)
        const recentOrders = await Order.findAll({
            where: { vendorId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        // Format recent orders
        const formattedRecentOrders = recentOrders.map(order => {
            const orderData = order.toJSON ? order.toJSON() : order;
            return {
                id: orderData.id,
                customer: orderData.user?.name || 'Unknown',
                amount: parseFloat(orderData.total || 0),
                status: orderData.status,
                date: orderData.createdAt
            };
        });

        // Get last 6 months revenue data for chart
        const monthlyRevenueChart = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthEndDate = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);

            const monthRevenueResult = await Order.findAll({
                where: {
                    vendorId,
                    createdAt: {
                        [Op.gte]: monthDate,
                        [Op.lte]: monthEndDate
                    }
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
                ],
                raw: true
            });

            const monthOrdersCount = await Order.count({
                where: {
                    vendorId,
                    createdAt: {
                        [Op.gte]: monthDate,
                        [Op.lte]: monthEndDate
                    }
                }
            });

            const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
            monthlyRevenueChart.push({
                month: monthNames[monthDate.getMonth()],
                year: monthDate.getFullYear(),
                revenue: parseFloat(monthRevenueResult[0]?.revenue || 0),
                orders: monthOrdersCount
            });
        }

        // Get last 30 days revenue data for chart
        const dailyRevenueChart = [];
        for (let i = 29; i >= 0; i--) {
            const dayDate = new Date(today);
            dayDate.setDate(dayDate.getDate() - i);
            dayDate.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayDate);
            dayEnd.setHours(23, 59, 59, 999);

            const dayRevenueResult = await Order.findAll({
                where: {
                    vendorId,
                    createdAt: {
                        [Op.gte]: dayDate,
                        [Op.lte]: dayEnd
                    }
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
                ],
                raw: true
            });

            const dayOrdersCount = await Order.count({
                where: {
                    vendorId,
                    createdAt: {
                        [Op.gte]: dayDate,
                        [Op.lte]: dayEnd
                    }
                }
            });

            dailyRevenueChart.push({
                date: dayDate.toISOString().split('T')[0],
                day: dayDate.getDate(),
                month: dayDate.getMonth() + 1,
                revenue: parseFloat(dayRevenueResult[0]?.revenue || 0),
                orders: dayOrdersCount
            });
        }

        // Get orders by status for pie chart
        const ordersByStatus = await Order.findAll({
            where: { vendorId },
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const statusChart = {
            pending: 0,
            confirmed: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };

        ordersByStatus.forEach(item => {
            if (statusChart.hasOwnProperty(item.status)) {
                statusChart[item.status] = parseInt(item.count || 0);
            }
        });

        return {
            stats: {
                totalOrders,
                totalProducts,
                activeProducts,
                totalRevenue,
                totalFollowers,
                pendingOrders,
                completedOrders,
                todayRevenue,
                monthlyRevenue
            },
            recentOrders: formattedRecentOrders,
            charts: {
                monthlyRevenue: monthlyRevenueChart,
                dailyRevenue: dailyRevenueChart,
                ordersByStatus: statusChart
            }
        };
    }

    /**
     * Get vendor revenue with date filtering
     * @param {number} vendorId - Vendor ID
     * @param {Date|null} fromDate - Start date (optional)
     * @param {Date|null} toDate - End date (optional)
     * @returns {Promise<object>}
     */
    async getVendorRevenue(vendorId, fromDate = null, toDate = null) {
        // Verify vendor exists
        const vendor = await User.findByPk(vendorId);
        if (!vendor) {
            throw new Error('User not found');
        }
        if (vendor.type !== 'vendor') {
            throw new Error(`User is not a vendor (type: ${vendor.type})`);
        }

        // Build where clause
        const where = { vendorId };

        // Add date filtering if provided
        if (fromDate || toDate) {
            where.createdAt = {};

            if (fromDate) {
                const startDate = new Date(fromDate);
                startDate.setHours(0, 0, 0, 0);
                where.createdAt[Op.gte] = startDate;
            }

            if (toDate) {
                const endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);
                where.createdAt[Op.lte] = endDate;
            }
        }

        // Get total revenue (sum of all orders in the period)
        const revenueResult = await Order.findAll({
            where,
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders']
            ],
            raw: true
        });

        const totalRevenue = parseFloat(revenueResult[0]?.totalRevenue || 0);
        const totalOrders = parseInt(revenueResult[0]?.totalOrders || 0);

        // Get revenue by payment status
        const paidRevenueResult = await Order.findAll({
            where: {
                ...where,
                paymentStatus: 'paid'
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'paidRevenue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'paidOrders']
            ],
            raw: true
        });

        const paidRevenue = parseFloat(paidRevenueResult[0]?.paidRevenue || 0);
        const paidOrders = parseInt(paidRevenueResult[0]?.paidOrders || 0);

        // Get revenue by order status (delivered orders)
        const deliveredRevenueResult = await Order.findAll({
            where: {
                ...where,
                status: 'delivered'
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'deliveredRevenue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'deliveredOrders']
            ],
            raw: true
        });

        const deliveredRevenue = parseFloat(deliveredRevenueResult[0]?.deliveredRevenue || 0);
        const deliveredOrders = parseInt(deliveredRevenueResult[0]?.deliveredOrders || 0);

        // Get pending revenue (orders not yet paid)
        const pendingRevenueResult = await Order.findAll({
            where: {
                ...where,
                paymentStatus: { [Op.in]: ['pending', 'remaining'] }
            },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('total')), 'pendingRevenue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'pendingOrders']
            ],
            raw: true
        });

        const pendingRevenue = parseFloat(pendingRevenueResult[0]?.pendingRevenue || 0);
        const pendingOrders = parseInt(pendingRevenueResult[0]?.pendingOrders || 0);

        // Get daily breakdown
        const dailyRevenueResult = await Order.findAll({
            where,
            attributes: [
                [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                [sequelize.fn('SUM', sequelize.col('total')), 'dailyRevenue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'dailyOrders']
            ],
            group: [sequelize.fn('DATE', sequelize.col('created_at'))],
            order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
            raw: true
        });

        let dailyBreakdown = [];

        // If date range is provided, fill in missing dates
        if (fromDate && toDate) {
            const startDate = new Date(fromDate);
            const endDate = new Date(toDate);
            const dateMap = new Map();

            dailyRevenueResult.forEach(item => {
                // Handle date string format from database (might be YYYY-MM-DD or full ISO)
                const dateStr = typeof item.date === 'string' ? item.date.substring(0, 10) : new Date(item.date).toISOString().substring(0, 10);
                dateMap.set(dateStr, {
                    revenue: parseFloat(item.dailyRevenue || 0),
                    orders: parseInt(item.dailyOrders || 0)
                });
            });

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().substring(0, 10);
                const data = dateMap.get(dateStr) || { revenue: 0, orders: 0 };

                dailyBreakdown.push({
                    date: dateStr,
                    revenue: data.revenue,
                    orders: data.orders
                });
            }
        } else {
            // If no complete range, just return what we have
            dailyBreakdown = dailyRevenueResult.map(item => ({
                date: typeof item.date === 'string' ? item.date.substring(0, 10) : new Date(item.date).toISOString().substring(0, 10),
                revenue: parseFloat(item.dailyRevenue || 0),
                orders: parseInt(item.dailyOrders || 0)
            }));
        }

        return {
            period: {
                from: fromDate ? new Date(fromDate).toISOString() : null,
                to: toDate ? new Date(toDate).toISOString() : null
            },
            summary: {
                totalRevenue,
                totalOrders,
                paidRevenue,
                paidOrders,
                deliveredRevenue,
                deliveredOrders,
                pendingRevenue,
                pendingOrders
            },
            dailyBreakdown
        };
    }
}

export default new VendorService();
