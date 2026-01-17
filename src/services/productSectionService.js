import { Op } from 'sequelize';
import sequelize from '../config/sequelize.js';
import ProductSection from '../models/ProductSection.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import AppSettings from '../models/AppSettings.js';
import Product from '../models/Product.js';
import OrderItem from '../models/OrderItem.js';
import Order from '../models/Order.js';
import Subcategory from '../models/Subcategory.js';
import Favorite from '../models/Favorite.js';
import Cart from '../models/Cart.js';
import DiscountProduct from '../models/DiscountProduct.js';
import Discount from '../models/Discount.js';
import productService from './productService.js';
import { getImagePath } from '../utils/imageHelper.js';
import { convertFilesToPaths } from '../utils/imageHelper.js';

// Helper function to transform section data
const transformSection = (section) => {
  if (!section) return section;
  
  const sectionData = section.toJSON ? section.toJSON() : section;
  
  if (sectionData.image) {
    sectionData.image = getImagePath(sectionData.image);
  }
  
  return sectionData;
};

class ProductSectionService {
  /**
   * Get all product sections
   * @param {boolean} includeInactive - Include inactive sections
   * @param {object} filters - Optional filters (type, vendorId, categoryId, appSettingId, page, limit)
   * @returns {Promise<object>} Object with sections array and pagination info
   */
  async getAllSections(includeInactive = false, filters = {}) {
    const { 
      type, 
      vendorId, 
      categoryId, 
      appSettingId,
      page = 1,
      limit = 50
    } = filters;

    const where = includeInactive ? {} : { isActive: true };
    
    // Add optional filters
    if (type) {
      where.type = type;
    }
    
    if (vendorId) {
      where.vendorId = vendorId;
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (appSettingId) {
      where.appSettingId = appSettingId;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get sections with pagination
    const sectionsResult = await ProductSection.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'phone', 'logoImage'],
          required: false
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'image'],
          required: false
        },
        {
          model: AppSettings,
          as: 'appSetting',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['order', 'ASC'], [sequelize.literal('`ProductSection`.`created_at`'), 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      distinct: true // Important when using includes
    });

    const totalCount = sectionsResult.count;
    const formattedSections = sectionsResult.rows.map(transformSection);

    return {
      sections: formattedSections,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasMore: offset + formattedSections.length < totalCount
      }
    };
  }

  /**
   * Get section by ID
   * @param {number} id - Section ID
   * @returns {Promise<object>} Section object
   */
  async getSectionById(id) {
    const section = await ProductSection.findByPk(id, {
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'phone', 'logoImage'],
          required: false
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'image'],
          required: false
        },
        {
          model: AppSettings,
          as: 'appSetting',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    if (!section) {
      throw new Error('Product section not found');
    }

    return transformSection(section);
  }

  /**
   * Create product section
   * @param {object} data - Section data
   * @returns {Promise<object>} Created section
   */
  async createSection(data) {
    const { name, type, vendorId, categoryId, image, rows, order, isActive, appSettingId } = data;

    if (!name || (typeof name === 'string' && name.trim() === '')) {
      throw new Error('Section name is required');
    }

    // Validate and normalize type - must match ENUM exactly
    const validTypes = ['vendor', 'category', 'bestSellers', 'lastAdded'];
    
    // Convert to string and trim
    const typeStr = type ? String(type).trim() : '';
    
    if (!typeStr || !validTypes.includes(typeStr)) {
      throw new Error(`Section type must be one of: "${validTypes.join('", "')}". Received: "${typeStr}"`);
    }

    // Normalize type to ensure it matches ENUM exactly (case-sensitive)
    const normalizedType = typeStr;

    // Validate type-specific requirements
    if (normalizedType === 'vendor' && !vendorId) {
      throw new Error('Vendor ID is required when type is "vendor"');
    }

    if (normalizedType === 'category' && !categoryId) {
      throw new Error('Category ID is required when type is "category"');
    }

    // bestSellers and lastAdded don't require vendorId or categoryId
    if ((normalizedType === 'bestSellers' || normalizedType === 'lastAdded') && (vendorId || categoryId)) {
      throw new Error('Vendor ID and Category ID are not allowed for "bestSellers" or "lastAdded" types');
    }

    // Validate rows
    if (rows !== undefined && (rows < 1 || rows > 10)) {
      throw new Error('Rows must be between 1 and 10');
    }

    // Get app setting ID (default to main settings if not provided)
    let finalAppSettingId = appSettingId;
    if (!finalAppSettingId) {
      const mainSettings = await AppSettings.findOne({ where: { name: 'app_main' } });
      if (mainSettings) {
        finalAppSettingId = mainSettings.id;
      } else {
        // If main settings don't exist, use 1 as default
        finalAppSettingId = 1;
      }
    } else {
      // Verify app setting exists
      const appSetting = await AppSettings.findByPk(finalAppSettingId);
      if (!appSetting) {
        throw new Error('Invalid app setting ID');
      }
    }

      // Verify vendor exists if provided
      if (vendorId) {
        const vendor = await User.findByPk(vendorId);
        if (!vendor || vendor.type !== 'vendor') {
          throw new Error('Invalid vendor ID');
        }
      }

    // Verify category exists if provided
    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        throw new Error('Invalid category ID');
      }
    }

    const section = await ProductSection.create({
      name: name.trim(),
      type: normalizedType,
      vendorId: normalizedType === 'vendor' ? vendorId : null,
      categoryId: normalizedType === 'category' ? categoryId : null,
      image: image || null,
      rows: rows || 1,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
      appSettingId: finalAppSettingId
    });

    return await this.getSectionById(section.id);
  }

  /**
   * Update product section
   * @param {number} id - Section ID
   * @param {object} data - Updated data
   * @returns {Promise<object>} Updated section
   */
  async updateSection(id, data) {
    const section = await ProductSection.findByPk(id);
    if (!section) {
      throw new Error('Product section not found');
    }

    const { name, type, vendorId, categoryId, image, rows, order, isActive, appSettingId } = data;

    // Validate type if provided
    if (type && !['vendor', 'category', 'bestSellers', 'lastAdded'].includes(type)) {
      throw new Error('Section type must be one of: "vendor", "category", "bestSellers", or "lastAdded"');
    }

    // Use existing type if not provided
    const finalType = type || section.type;

    // Validate type-specific requirements
    if (finalType === 'vendor') {
      const finalVendorId = vendorId !== undefined ? vendorId : section.vendorId;
      if (!finalVendorId) {
        throw new Error('Vendor ID is required when type is "vendor"');
      }
      // Verify vendor exists
      const vendor = await User.findByPk(finalVendorId);
      if (!vendor || vendor.type !== 'vendor') {
        throw new Error('Invalid vendor ID');
      }
    }

    if (finalType === 'category') {
      const finalCategoryId = categoryId !== undefined ? categoryId : section.categoryId;
      if (!finalCategoryId) {
        throw new Error('Category ID is required when type is "category"');
      }
      // Verify category exists
      const category = await Category.findByPk(finalCategoryId);
      if (!category) {
        throw new Error('Invalid category ID');
      }
    }

    // bestSellers and lastAdded don't require vendorId or categoryId
    if ((finalType === 'bestSellers' || finalType === 'lastAdded') && (vendorId !== undefined || categoryId !== undefined)) {
      if (vendorId !== undefined && vendorId !== null) {
        throw new Error('Vendor ID is not allowed for "bestSellers" or "lastAdded" types');
      }
      if (categoryId !== undefined && categoryId !== null) {
        throw new Error('Category ID is not allowed for "bestSellers" or "lastAdded" types');
      }
    }

    // Validate rows
    if (rows !== undefined && (rows < 1 || rows > 10)) {
      throw new Error('Rows must be between 1 and 10');
    }

    // Update appSettingId if provided
    if (appSettingId !== undefined) {
      const appSetting = await AppSettings.findByPk(appSettingId);
      if (!appSetting) {
        throw new Error('Invalid app setting ID');
      }
      section.appSettingId = appSettingId;
    }

    // Update fields
    if (name !== undefined) section.name = name;
    if (type !== undefined) section.type = type;
    if (finalType === 'vendor') {
      section.vendorId = vendorId !== undefined ? vendorId : section.vendorId;
      section.categoryId = null;
    } else if (finalType === 'category') {
      section.categoryId = categoryId !== undefined ? categoryId : section.categoryId;
      section.vendorId = null;
    } else if (finalType === 'bestSellers' || finalType === 'lastAdded') {
      section.vendorId = null;
      section.categoryId = null;
    }
    if (image !== undefined) section.image = image;
    if (rows !== undefined) section.rows = rows;
    if (order !== undefined) section.order = order;
    if (isActive !== undefined) section.isActive = isActive;

    await section.save();

    return await this.getSectionById(section.id);
  }

  /**
   * Delete product section
   * @param {number} id - Section ID
   * @returns {Promise<object>} Deletion result
   */
  async deleteSection(id) {
    const section = await ProductSection.findByPk(id);
    if (!section) {
      throw new Error('Product section not found');
    }

    await section.destroy();
    return { message: 'Product section deleted successfully' };
  }

  /**
   * Reorder sections
   * @param {Array} sections - Array of {id, order} objects
   * @returns {Promise<Array>} Updated sections
   */
  async reorderSections(sections) {
    const updatePromises = sections.map(({ id, order }) => {
      return ProductSection.update({ order }, { where: { id } });
    });

    await Promise.all(updatePromises);

    // Get new product section orders to check for conflicts with static sections
    const newProductSectionOrders = sections.map(s => s.order);

    // Update app settings to resolve conflicts and reflect the change
    try {
      const mainSettings = await AppSettings.findOne({ where: { name: 'app_main' } });
      if (mainSettings) {
        const settingsData = mainSettings.toJSON ? mainSettings.toJSON() : mainSettings;
        
        // Static section orders that might conflict
        const staticSectionOrders = [
          { key: 'bannersOrder', value: settingsData.bannersOrder },
          { key: 'categoryOrder', value: settingsData.categoryOrder },
          { key: 'livestreamOrder', value: settingsData.livestreamOrder },
          { key: 'vendorsOrder', value: settingsData.vendorsOrder },
          { key: 'marketplaceOrder', value: settingsData.marketplaceOrder }
        ].filter(item => item.value !== undefined && item.value !== null);

        // Find conflicts: static sections that use the same order as product sections
        const conflicts = staticSectionOrders.filter(staticOrder => 
          newProductSectionOrders.includes(staticOrder.value)
        );

        // Resolve conflicts by adjusting static section orders
        if (conflicts.length > 0) {
          const updateData = {};
          let maxOrder = Math.max(
            ...staticSectionOrders.map(s => s.value),
            ...newProductSectionOrders,
            0
          );

          conflicts.forEach(conflict => {
            // Find next available order that doesn't conflict with product sections or other static sections
            let newOrder = maxOrder + 1;
            const allUsedOrders = [
              ...newProductSectionOrders,
              ...staticSectionOrders.map(s => s.value)
            ];

            while (allUsedOrders.includes(newOrder)) {
              newOrder++;
            }

            updateData[conflict.key] = newOrder;
            maxOrder = newOrder;
          });

          // Update app settings with resolved orders
          if (Object.keys(updateData).length > 0) {
            await mainSettings.update({
              ...updateData,
              updatedAt: new Date()
            });
            console.log('Adjusted static section orders to avoid conflicts:', updateData);
          }
        } else {
          // No conflicts, just update timestamp
          await mainSettings.update({ updatedAt: new Date() });
        }
      }
    } catch (error) {
      // Log error but don't fail the reorder operation
      console.error('Error updating app settings after reordering sections:', error);
    }

    // Get all sections without pagination for reorder response
    const allSectionsResult = await this.getAllSections(true, { limit: 1000 });
    // Return sections array (backward compatibility)
    return allSectionsResult.sections || allSectionsResult;
  }

  /**
   * Get products for a section
   * @param {string} type - Section type: 'vendor', 'category', 'bestSellers', 'lastAdded'
   * @param {number} id - Vendor ID or Category ID (required for vendor/category types)
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Number of products to return (default: 20)
   * @param {number} userId - Optional user ID for favorites/cart
   * @param {number} governorateId - Optional governorate ID to filter by vendor's governorate
   * @returns {Promise<object>} Object with products array and pagination info
   */
  async getSectionProducts(type, id = null, page = 1, limit = 20, userId = null, governorateId = null) {
    if (!type || !['vendor', 'category', 'bestSellers', 'lastAdded'].includes(type)) {
      throw new Error('Type must be one of: "vendor", "category", "bestSellers", or "lastAdded"');
    }

    // Validate id for vendor and category types
    if ((type === 'vendor' || type === 'category') && !id) {
      throw new Error(`${type === 'vendor' ? 'Vendor' : 'Category'} ID is required`);
    }

    let productsResult;
    const where = { isActive: true };
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build include array for vendor with governorate filter
    const vendorInclude = {
      model: User,
      as: 'vendor',
      attributes: ['id', 'name', 'email', 'type'],
      required: governorateId !== null && governorateId !== undefined // If filtering by governorate, make vendor required
    };

    // Filter by governorate through vendor
    if (governorateId !== null && governorateId !== undefined) {
      vendorInclude.where = {
        governmentId: governorateId
      };
    }

    if (type === 'vendor') {
      where.vendorId = parseInt(id, 10);
      
      productsResult = await Product.findAndCountAll({
        where,
        include: [
          vendorInclude,
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });
    } else if (type === 'category') {
      where.categoryId = parseInt(id, 10);
      productsResult = await Product.findAndCountAll({
        where,
        include: [
          vendorInclude,
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });
    } else if (type === 'bestSellers') {
      // Get products ordered by total sales (sum of quantities from order_items)
      productsResult = await Product.findAndCountAll({
        where,
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COALESCE(SUM(\`oi\`.\`quantity\`), 0)
                FROM \`order_items\` \`oi\`
                INNER JOIN \`orders\` \`o\` ON \`oi\`.\`order_id\` = \`o\`.\`id\`
                WHERE \`oi\`.\`product_id\` = \`Product\`.\`id\`
                AND \`o\`.\`status\` IN ('delivered')
              )`),
              'totalSales'
            ]
          ]
        },
        include: [
          vendorInclude,
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        order: [[sequelize.literal('totalSales'), 'DESC'], [['createdAt', 'DESC']]],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });
    } else if (type === 'lastAdded') {
      // Get latest products
      productsResult = await Product.findAndCountAll({
        where,
        include: [
          vendorInclude,
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: Subcategory,
            as: 'subcategory',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });
    }

    const totalCount = productsResult?.count || 0;
    const products = productsResult?.rows || [];

    if (!products || products.length === 0) {
      return {
        products: [],
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          hasMore: false
        }
      };
    }

    // Get product IDs
    const productIds = products.map(p => p.id);

    // Get active discounts
    const now = new Date();
    const activeDiscountProducts = await DiscountProduct.findAll({
      where: {
        productId: { [Op.in]: productIds }
      },
      include: [
        {
          model: Discount,
          as: 'discount',
          where: {
            isActive: true,
            startDate: { [Op.lte]: now },
            endDate: { [Op.gte]: now }
          },
          attributes: ['id', 'discount']
        }
      ],
      attributes: ['productId', 'discountId']
    });

    // Create discount map
    const discountMap = new Map();
    activeDiscountProducts.forEach(dp => {
      if (dp.discount) {
        discountMap.set(dp.productId, parseFloat(dp.discount.discount || 0));
      }
    });

    // Get favorites and cart items if user is authenticated
    let favoriteProductIds = new Set();
    let cartProductIds = new Set();

    if (userId) {
      const [favorites, cartItems] = await Promise.all([
        Favorite.findAll({
          where: { userId },
          attributes: ['productId']
        }),
        Cart.findAll({
          where: { userId },
          attributes: ['productId']
        })
      ]);

      favorites.forEach(f => favoriteProductIds.add(f.productId));
      cartItems.forEach(c => cartProductIds.add(c.productId));
    }

    // Transform products
    const transformedProducts = products.map(product => {
      const productData = product.toJSON ? product.toJSON() : product;
      
      // Convert images
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
      productData.images = convertFilesToPaths(productData.images);

      // Handle sizes and colors
      if (productData.sizes) {
        if (typeof productData.sizes === 'string') {
          try {
            productData.sizes = JSON.parse(productData.sizes);
          } catch (e) {
            productData.sizes = [];
          }
        }
        if (!Array.isArray(productData.sizes)) {
          productData.sizes = [];
        }
      } else {
        productData.sizes = [];
      }

      if (productData.colors) {
        if (typeof productData.colors === 'string') {
          try {
            productData.colors = JSON.parse(productData.colors);
          } catch (e) {
            productData.colors = [];
          }
        }
        if (!Array.isArray(productData.colors)) {
          productData.colors = [];
        }
      } else {
        productData.colors = [];
      }

      // Calculate prices with discount (same as getAllProducts)
      const price = productData.price && productData.isPrice ? parseFloat(productData.price) : 0;
      let discountPercentage = 0;
      
      // Check discount map first (active discount), then product discount field
      if (discountMap.has(productData.id)) {
        discountPercentage = discountMap.get(productData.id);
      } else if (productData.discount) {
        discountPercentage = parseFloat(productData.discount || 0);
      }
      
      const originalPrice = price;
      const finalPrice = discountPercentage > 0 
        ? price * (1 - discountPercentage / 100)
        : price;
      
      productData.originalPrice = parseFloat(originalPrice.toFixed(2));
      productData.finalPrice = parseFloat(finalPrice.toFixed(2));
      productData.priceAfterDiscount = parseFloat(finalPrice.toFixed(2));
      productData.discount = discountPercentage;
      productData.isDiscount = discountPercentage > 0;
      
      // Add favorite and cart status
      productData.isFavorite = favoriteProductIds.has(productData.id);
      productData.isCart = cartProductIds.has(productData.id);
      
      // Add status based on isActive (same as getAllProducts)
      productData.status = productData.isActive ? 'published' : 'pending';

      // Remove totalSales from response if it exists
      if (productData.totalSales !== undefined) {
        delete productData.totalSales;
      }

      return productData;
    });

    return {
      products: transformedProducts,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasMore: offset + transformedProducts.length < totalCount
      }
    };
  }
}

export default new ProductSectionService();
