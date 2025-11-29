import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Government from '../models/Government.js';
import Category from '../models/Category.js';

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

        return updatedVendor;
    }

    /**
     * Get vendor profile by ID
     */
    async getVendorProfile(vendorId) {
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

        return vendor;
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

        return {
            vendors: rows,
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
