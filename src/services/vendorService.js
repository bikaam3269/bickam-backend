import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
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
                // Handle empty strings for optional fields - convert to null
                if (data[field] === '' || data[field] === 'null' || data[field] === 'undefined') {
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
        
        // Add isOnline status (true if lat or long are missing, else false)
        vendorData.isOnline = !vendorData.latitude || !vendorData.longitude;

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

        const vendorsWithStatus = rows.map(vendor => {
            // Transform vendor data with image URLs
            const vendorData = transformVendorImages(vendor);
            // If vendor does not have lat or long, return isOnline: true, else false
            vendorData.isOnline = !vendorData.latitude || !vendorData.longitude;
            return vendorData;
        });

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
}

export default new VendorService();
