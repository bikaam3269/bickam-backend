import { Op } from 'sequelize';
import sequelize from '../config/sequelize.js';
import MarketingProduct from '../models/MarketingProduct.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import Government from '../models/Government.js';
import City from '../models/City.js';
import { convertFilesToPaths } from '../utils/imageHelper.js';

class MarketingProductService {
  async getAllMarketingProducts(filters = {}) {
    const { 
      governmentId, 
      cityId,
      categoryId, 
      subcategoryId, 
      search, 
      minPrice, 
      maxPrice, 
      isActive,
      page = 1,
      limit = 50
    } = filters;

    const where = {};

    if (governmentId) {
      where.governmentId = governmentId;
    }

    if (cityId) {
      where.cityId = cityId;
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

    if (minPrice !== undefined) {
      where.price = { ...where.price, [Op.gte]: minPrice };
    }

    if (maxPrice !== undefined) {
      where.price = { ...where.price, [Op.lte]: maxPrice };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: products } = await MarketingProduct.findAndCountAll({
      where,
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
        },
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'order']
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Ensure images is always returned as an array
    const formattedProducts = products.map(product => {
      const productData = product.toJSON ? product.toJSON() : product;
      if (productData.images) {
        if (typeof productData.images === 'string') {
          try {
            productData.images = JSON.parse(productData.images);
          } catch (e) {
            productData.images = [];
          }
        }
        if (!Array.isArray(productData.images)) {
          productData.images = [];
        }
      } else {
        productData.images = [];
      }
      
      // Convert image filenames to paths
      productData.images = convertFilesToPaths(productData.images);
      
      return productData;
    });

    return {
      products: formattedProducts,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
        hasMore: offset + formattedProducts.length < count
      }
    };
  }

  async getMarketingProductById(id) {
    const product = await MarketingProduct.findByPk(id, {
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
        },
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'order']
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!product) {
      throw new Error('Marketing product not found');
    }

    // Ensure images is always returned as an array
    const productData = product.toJSON ? product.toJSON() : product;
    if (productData.images) {
      if (typeof productData.images === 'string') {
        try {
          productData.images = JSON.parse(productData.images);
        } catch (e) {
          productData.images = [];
        }
      }
      if (!Array.isArray(productData.images)) {
        productData.images = [];
      }
    } else {
      productData.images = [];
    }
    
    // Convert image filenames to full URLs
    productData.images = convertFilesToPaths(productData.images);

    return productData;
  }

  async createMarketingProduct(data) {
    const { name, images, price, isPrice, description, categoryId, subcategoryId, discount, quantity, isActive, governmentId, cityId } = data;

    if (!name) {
      throw new Error('Product name is required');
    }

    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    if (!subcategoryId) {
      throw new Error('Subcategory ID is required');
    }

    if (!governmentId) {
      throw new Error('Government ID is required');
    }

    if (!cityId) {
      throw new Error('City ID is required');
    }

    // Validate images array
    if (images && !Array.isArray(images)) {
      throw new Error('Images must be an array of URLs');
    }

    // Validate discount
    if (discount !== undefined && (discount < 0 || discount > 100)) {
      throw new Error('Discount must be between 0 and 100');
    }

    // Validate quantity
    if (quantity !== undefined && quantity < 0) {
      throw new Error('Quantity must be greater than or equal to 0');
    }

    const productData = {
      name,
      images: images || [],
      price: price || null,
      isPrice: isPrice !== undefined ? isPrice : false,
      description: description || null,
      categoryId,
      subcategoryId,
      discount: discount || 0,
      quantity: quantity !== undefined ? parseInt(quantity) : 0,
      isActive: isActive !== undefined ? (isActive === true || isActive === 'true' || isActive === 1 || isActive === '1') : true,
      governmentId,
      cityId
    };

    const product = await MarketingProduct.create(productData);

    return await this.getMarketingProductById(product.id);
  }

  async updateMarketingProduct(id, data) {
    const product = await MarketingProduct.findByPk(id);
    if (!product) {
      throw new Error('Marketing product not found');
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

    // Validate quantity if provided
    if (data.quantity !== undefined && data.quantity < 0) {
      throw new Error('Quantity must be greater than or equal to 0');
    }

    // Convert quantity to integer if provided
    if (data.quantity !== undefined) {
      data.quantity = parseInt(data.quantity);
    }

    // Convert isActive to boolean if provided
    if (data.isActive !== undefined) {
      data.isActive = data.isActive === true || data.isActive === 'true' || data.isActive === 1 || data.isActive === '1';
    }

    // Convert governmentId and cityId to integers if provided
    if (data.governmentId !== undefined) {
      data.governmentId = parseInt(data.governmentId);
    }
    if (data.cityId !== undefined) {
      data.cityId = parseInt(data.cityId);
    }

    Object.assign(product, data);
    await product.save();

    return await this.getMarketingProductById(product.id);
  }

  async deleteMarketingProduct(id) {
    const product = await MarketingProduct.findByPk(id);
    if (!product) {
      throw new Error('Marketing product not found');
    }

    await product.destroy();
    return true;
  }
}

export default new MarketingProductService();

