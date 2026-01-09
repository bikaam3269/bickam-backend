import { Op } from 'sequelize';
import MarketplaceProduct from '../models/MarketplaceProduct.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import notificationService from './notificationService.js';
import { config } from '../config/app.js';

// Helper function to construct full file URL
const getFileUrl = (filename) => {
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
  // Otherwise, it's just a filename, add base URL and /files/ prefix
  const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;
  return `${baseUrl}/files/${filename}`;
};

// Helper function to convert array of file filenames to full URLs
const convertFilesToUrls = (files) => {
  if (!files || !Array.isArray(files)) {
    return [];
  }
  return files.map(file => getFileUrl(file)).filter(url => url !== null);
};

// Helper function to transform product data with file URLs
const transformProductData = (product) => {
  if (!product) return product;
  const productData = product.toJSON ? product.toJSON() : product;
  if (productData.files) {
    productData.files = convertFilesToUrls(productData.files);
  }
  return productData;
};

class MarketplaceProductService {
  /**
   * Create a new marketplace product (pending approval)
   */
  async createProduct(userId, productData) {
    const { name, description, files, phone, price, isNegotiable } = productData;

    if (!name || !phone || price === undefined) {
      throw new Error('Name, phone, and price are required');
    }

    console.log('[createProduct] Creating product:', { userId, name, phone, price, isNegotiable });

    const product = await MarketplaceProduct.create({
      userId,
      name,
      description: description || null,
      files: files || [],
      phone,
      price: parseFloat(price),
      isNegotiable: isNegotiable === true || isNegotiable === 'true' || isNegotiable === 1,
      status: 'pending'
    });

    console.log('[createProduct] Product created:', { id: product.id, userId: product.userId });

    return await this.getProductById(product.id);
  }

  /**
   * Get product by ID
   */
  async getProductById(productId, includeUser = true) {
    const include = [];
    
    if (includeUser) {
      include.push({
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      });
      include.push({
        model: User,
        as: 'admin',
        attributes: ['id', 'name', 'email'],
        required: false
      });
    }

    const product = await MarketplaceProduct.findByPk(productId, {
      include
    });

    if (!product) {
      throw new Error('Marketplace product not found');
    }

    return transformProductData(product);
  }

  /**
   * Get all products with filters (for users - only approved)
   */
  async getAllProducts(filters = {}) {
    const {
      status = 'approved', // Default to approved for regular users
      userId,
      search,
      minPrice,
      maxPrice,
      page = 1,
      limit = 50
    } = filters;

    const where = {};
    const andConditions = [];

    // Only show approved products to regular users
    if (status === 'approved') {
      where.status = 'approved';
      // Only show products that haven't expired
      andConditions.push({
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      });
    } else if (status) {
      // Admin can see all statuses
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    // Handle search
    if (search) {
      andConditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ]
      });
    }

    // Add AND conditions if any
    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price[Op.gte] = parseFloat(minPrice);
      }
      if (maxPrice !== undefined) {
        where.price[Op.lte] = parseFloat(maxPrice);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await MarketplaceProduct.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    return {
      products: rows.map(transformProductData),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
        hasMore: offset + rows.length < count
      }
    };
  }

  /**
   * Get pending products (for admin)
   */
  async getPendingProducts(page = 1, limit = 50) {
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await MarketplaceProduct.findAndCountAll({
      where: {
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    return {
      products: rows.map(transformProductData),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
        hasMore: offset + rows.length < count
      }
    };
  }

  /**
   * Approve product (admin only)
   */
  async approveProduct(productId, adminId, expirationDays = 10) {
    const product = await MarketplaceProduct.findByPk(productId);
    
    if (!product) {
      throw new Error('Marketplace product not found');
    }

    if (product.status !== 'pending') {
      throw new Error(`Product is already ${product.status}`);
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expirationDays));

    product.status = 'approved';
    product.adminId = adminId;
    product.approvedAt = new Date();
    product.expiresAt = expiresAt;
    product.rejectionReason = null;

    await product.save();

    // Notify user about product approval
    try {
      await notificationService.notifyMarketplaceProductApproved(
        product.userId,
        product.id,
        product.name
      );
    } catch (error) {
      console.error('Failed to notify user about marketplace product approval:', error.message);
    }

    return await this.getProductById(product.id);
  }

  /**
   * Reject product (admin only)
   */
  async rejectProduct(productId, adminId, rejectionReason = null) {
    const product = await MarketplaceProduct.findByPk(productId);
    
    if (!product) {
      throw new Error('Marketplace product not found');
    }

    if (product.status !== 'pending') {
      throw new Error(`Product is already ${product.status}`);
    }

    product.status = 'rejected';
    product.adminId = adminId;
    product.rejectionReason = rejectionReason;
    product.approvedAt = null;
    product.expiresAt = null;

    await product.save();

    return await this.getProductById(product.id);
  }

  /**
   * Update marketplace product (admin only)
   */
  async updateProduct(productId, updateData) {
    const product = await MarketplaceProduct.findByPk(productId);
    
    if (!product) {
      throw new Error('Marketplace product not found');
    }

    // Allowed fields to update
    const allowedFields = ['isNegotiable', 'name', 'description', 'phone', 'price'];
    const fieldsToUpdate = {};

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'isNegotiable') {
          fieldsToUpdate[field] = updateData[field] === true || updateData[field] === 'true' || updateData[field] === 1;
        } else if (field === 'price') {
          fieldsToUpdate[field] = parseFloat(updateData[field]);
        } else {
          fieldsToUpdate[field] = updateData[field];
        }
      }
    });

    await product.update(fieldsToUpdate);

    return await this.getProductById(product.id);
  }

  /**
   * Update product expiration days (admin only)
   */
  async updateExpiration(productId, expirationDays) {
    const product = await MarketplaceProduct.findByPk(productId);
    
    if (!product) {
      throw new Error('Marketplace product not found');
    }

    if (product.status !== 'approved') {
      throw new Error('Only approved products can have expiration updated');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expirationDays));

    product.expiresAt = expiresAt;
    await product.save();

    return await this.getProductById(product.id);
  }

  /**
   * Delete expired products (called by cron job)
   */
  async deleteExpiredProducts() {
    const now = new Date();
    
    // Find all expired products
    const expiredProducts = await MarketplaceProduct.findAll({
      where: {
        status: 'approved',
        expiresAt: {
          [Op.lte]: now
        }
      }
    });

    const deletedCount = expiredProducts.length;
    const deletedFiles = [];
    
    // Save product info before deletion
    const deletedProductsInfo = expiredProducts.map(p => ({ 
      id: p.id, 
      name: p.name,
      files: p.files || []
    }));

    // Delete files and then delete products
    for (const product of expiredProducts) {
      // Delete associated files
      if (product.files && Array.isArray(product.files)) {
        for (const filePath of product.files) {
          try {
            const fullPath = path.resolve(process.cwd(), 'files', path.basename(filePath));
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              deletedFiles.push(filePath);
            }
          } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error.message);
          }
        }
      }

      // Delete product from database
      await product.destroy();
    }

    return {
      deletedCount,
      deletedFiles: deletedFiles.length,
      products: deletedProductsInfo
    };
  }

  /**
   * Delete product by ID (user can delete their own, admin can delete any)
   */
  async deleteProduct(productId, userId, userType) {
    const product = await MarketplaceProduct.findByPk(productId);
    
    if (!product) {
      throw new Error('Marketplace product not found');
    }

    // Check permissions
    if (userType !== 'admin' && product.userId !== userId) {
      throw new Error('Unauthorized to delete this product');
    }

    // Delete associated files
    if (product.files && Array.isArray(product.files)) {
      for (const filePath of product.files) {
        try {
          const fullPath = path.resolve(process.cwd(), 'files', path.basename(filePath));
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (error) {
          console.error(`Error deleting file ${filePath}:`, error.message);
        }
      }
    }

    // Delete product
    await product.destroy();

    return { message: 'Product deleted successfully' };
  }

  /**
   * Get user's products
   */
  async getUserProducts(userId, status = null) {
    console.log('========================================');
    console.log('[getUserProducts] Received userId:', userId);
    console.log('[getUserProducts] Received userId type:', typeof userId);
    console.log('========================================');
    
    // Ensure userId is an integer
    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      throw new Error('Invalid user ID');
    }

    console.log('[getUserProducts] Parsed userIdInt:', userIdInt);
    console.log('[getUserProducts] Parsed userIdInt type:', typeof userIdInt);

    // First, let's check if there are any products for this user at all
    const allUserProducts = await MarketplaceProduct.findAll({
      where: { userId: userIdInt },
      attributes: ['id', 'userId', 'name', 'status'],
      raw: true
    });
    console.log('[getUserProducts] All products for user (raw query):', JSON.stringify(allUserProducts, null, 2));

    const where = { userId: userIdInt };
    
    if (status) {
      where.status = status;
    }

    console.log('[getUserProducts] Query params:', { userId: userIdInt, status, where });

    const products = await MarketplaceProduct.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log('[getUserProducts] Found products:', products.length);
    if (products.length > 0) {
      console.log('[getUserProducts] First product userId:', products[0].userId, 'Type:', typeof products[0].userId);
    } else {
      console.log('[getUserProducts] No products found. Checking raw query result...');
    }

    return products.map(transformProductData);
  }
}

export default new MarketplaceProductService();

