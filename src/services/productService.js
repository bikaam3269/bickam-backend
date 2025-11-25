import { Op } from 'sequelize';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import notificationService from './notificationService.js';

class ProductService {
  async getAllProducts(filters = {}) {
    const { vendorId, categoryId, subcategoryId, search, minPrice, maxPrice } = filters;
    const where = {};

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (subcategoryId) {
      where.subcategoryId = subcategoryId;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price[Op.gte] = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price[Op.lte] = maxPrice;
      }
    }

    const products = await Product.findAll({
      where,
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email', 'type']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: Subcategory,
          as: 'subcategory',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return products;
  }

  async getProductById(id) {
    const product = await Product.findByPk(id, {
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email', 'type']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: Subcategory,
          as: 'subcategory',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  async createProduct(data) {
    const { name, images, price, isPrice, description, categoryId, subcategoryId, discount } = data;

    if (!name) {
      throw new Error('Product name is required');
    }

    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    if (!subcategoryId) {
      throw new Error('Subcategory ID is required');
    }

    // Validate images array
    if (images && !Array.isArray(images)) {
      throw new Error('Images must be an array of URLs');
    }

    // Validate discount
    if (discount !== undefined && (discount < 0 || discount > 100)) {
      throw new Error('Discount must be between 0 and 100');
    }

    const productData = {
      name,
      images: images || [],
      vendorId: data.vendorId || null,
      price: price || null,
      isPrice: isPrice !== undefined ? isPrice : false,
      description: description || null,
      categoryId,
      subcategoryId,
      discount: discount || 0
    };

    const product = await Product.create(productData);

    // Notify all followers of the vendor about the new product
    if (productData.vendorId) {
      try {
        const vendor = await User.findByPk(productData.vendorId);
        if (vendor) {
          await notificationService.notifyNewProductToFollowers(
            productData.vendorId,
            product.id,
            product.name,
            vendor.name
          );
        }
      } catch (error) {
        console.error('Failed to notify followers about new product:', error.message);
      }
    }

    return await this.getProductById(product.id);
  }

  async updateProduct(id, data, currentUser) {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Only vendor who owns the product or admin can update
    if (product.vendorId && currentUser.type !== 'admin' && currentUser.id !== product.vendorId) {
      throw new Error('Unauthorized to update this product');
    }

    // Validate images if provided
    if (data.images !== undefined) {
      if (!Array.isArray(data.images)) {
        throw new Error('Images must be an array of URLs');
      }
    }

    // Validate discount if provided
    if (data.discount !== undefined && (data.discount < 0 || data.discount > 100)) {
      throw new Error('Discount must be between 0 and 100');
    }

    Object.assign(product, data);
    await product.save();

    return await this.getProductById(product.id);
  }

  async deleteProduct(id, currentUser) {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Only vendor who owns the product or admin can delete
    if (product.vendorId && currentUser.type !== 'admin' && currentUser.id !== product.vendorId) {
      throw new Error('Unauthorized to delete this product');
    }

    await product.destroy();
    return true;
  }

  async getProductsByVendor(vendorId) {
    return await Product.findAll({
      where: { vendorId },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: Subcategory,
          as: 'subcategory',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async getMyProducts(vendorId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: { vendorId },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: Subcategory,
          as: 'subcategory',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    return {
      products: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages
      }
    };
  }
}

export default new ProductService();

