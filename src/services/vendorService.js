import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Government from '../models/Government.js';
import Category from '../models/Category.js';
import City from '../models/City.js';
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
            'cityId',
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
                    // Parse ID fields as integers
                    if (field === 'cityId' || field === 'governmentId' || field === 'categoryId') {
                        const parsedValue = parseInt(data[field], 10);
                        updateData[field] = isNaN(parsedValue) ? null : parsedValue;
                    } else {
                        updateData[field] = data[field];
                    }
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
                },
                {
                    model: City,
                    as: 'city',
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
                },
                {
                    model: City,
                    as: 'city',
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
                },
                {
                    model: City,
                    as: 'city',
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
    async getVendorDashboardStats(vendorId) {
        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLast7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfLast30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total orders
        const totalOrders = await Order.count({
            where: { vendorId: parseInt(vendorId) }
        });

        // Orders by status
        const pendingOrders = await Order.count({
            where: { vendorId: parseInt(vendorId), status: 'pending' }
        });

        const confirmedOrders = await Order.count({
            where: { vendorId: parseInt(vendorId), status: 'confirmed' }
        });

        const processingOrders = await Order.count({
            where: { vendorId: parseInt(vendorId), status: 'processing' }
        });

        const shippedOrders = await Order.count({
            where: { vendorId: parseInt(vendorId), status: 'shipped' }
        });

        const deliveredOrders = await Order.count({
            where: { vendorId: parseInt(vendorId), status: 'delivered' }
        });

        const cancelledOrders = await Order.count({
            where: { vendorId: parseInt(vendorId), status: 'cancelled' }
        });

        // Total products
        const totalProducts = await Product.count({
            where: { vendorId: parseInt(vendorId) }
        });

        // Active products
        const activeProducts = await Product.count({
            where: { vendorId: parseInt(vendorId), isActive: true }
        });

        // Total followers
        const totalFollowers = await followService.getFollowCount(parseInt(vendorId));

        // Revenue calculations
        const allOrders = await Order.findAll({
            where: { vendorId: parseInt(vendorId) },
            attributes: ['total', 'status', 'createdAt']
        });

        let totalRevenue = 0;
        let todayRevenue = 0;
        let monthlyRevenue = 0;
        let last7DaysRevenue = 0;
        let last30DaysRevenue = 0;

        allOrders.forEach(order => {
            const orderTotal = parseFloat(order.total) || 0;
            totalRevenue += orderTotal;

            const orderDate = new Date(order.createdAt);
            if (orderDate >= startOfToday) {
                todayRevenue += orderTotal;
            }
            if (orderDate >= startOfMonth) {
                monthlyRevenue += orderTotal;
            }
            if (orderDate >= startOfLast7Days) {
                last7DaysRevenue += orderTotal;
            }
            if (orderDate >= startOfLast30Days) {
                last30DaysRevenue += orderTotal;
            }
        });

        // Revenue by status (only delivered orders count as revenue)
        const completedRevenue = allOrders
            .filter(order => order.status === 'delivered')
            .reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);

        // Chart data - Revenue for last 7 days
        const revenueChartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dayRevenue = allOrders
                .filter(order => {
                    const orderDate = new Date(order.createdAt);
                    return orderDate >= date && orderDate < nextDate;
                })
                .reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);

            revenueChartData.push({
                date: date.toISOString().split('T')[0],
                revenue: parseFloat(dayRevenue.toFixed(2))
            });
        }

        // Chart data - Orders for last 7 days
        const ordersChartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dayOrders = allOrders.filter(order => {
                const orderDate = new Date(order.createdAt);
                return orderDate >= date && orderDate < nextDate;
            }).length;

            ordersChartData.push({
                date: date.toISOString().split('T')[0],
                orders: dayOrders
            });
        }

        // Recent orders (last 10)
        const recentOrders = await Order.findAll({
            where: { vendorId: parseInt(vendorId) },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        const formattedRecentOrders = recentOrders.map(order => ({
            id: order.id,
            customer: order.user?.name || 'غير معروف',
            amount: parseFloat(order.total) || 0,
            status: order.status,
            date: order.createdAt
        }));

        return {
            stats: {
                totalOrders,
                totalProducts,
                activeProducts,
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                completedRevenue: parseFloat(completedRevenue.toFixed(2)),
                todayRevenue: parseFloat(todayRevenue.toFixed(2)),
                monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
                last7DaysRevenue: parseFloat(last7DaysRevenue.toFixed(2)),
                last30DaysRevenue: parseFloat(last30DaysRevenue.toFixed(2)),
                totalFollowers,
                ordersByStatus: {
                    pending: pendingOrders,
                    confirmed: confirmedOrders,
                    processing: processingOrders,
                    shipped: shippedOrders,
                    delivered: deliveredOrders,
                    cancelled: cancelledOrders
                }
            },
            charts: {
                revenue: revenueChartData,
                orders: ordersChartData
            },
            recentOrders: formattedRecentOrders
        };
    }
}

export default new VendorService();
