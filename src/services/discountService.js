import { Op } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Discount from '../models/Discount.js';
import DiscountProduct from '../models/DiscountProduct.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Government from '../models/Government.js';
import Category from '../models/Category.js';

class DiscountService {
  /**
   * Create a new discount
   * @param {number} vendorId - Vendor ID
   * @param {object} discountData - Discount data (title, body, image, startDate, endDate, products)
   * @returns {Promise<object>}
   */
  async createDiscount(vendorId, discountData) {
    const { title, body, image, startDate, endDate, discount, products } = discountData;

    // Validate required fields
    if (!title || !startDate || !endDate || discount === undefined || discount === null) {
      throw new Error('Title, start date, end date, and discount percentage are required');
    }

    // Handle products - ensure it's an array
    let productsArray = products;
    if (typeof products === 'string') {
      try {
        productsArray = JSON.parse(products);
      } catch (e) {
        throw new Error('Products must be a valid array');
      }
    }

    if (!productsArray || !Array.isArray(productsArray) || productsArray.length === 0) {
      throw new Error('Products array is required and must not be empty');
    }

    // Validate discount percentage
    const discountPercent = parseFloat(discount);
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      throw new Error('Discount must be a number between 0 and 100');
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      throw new Error('End date must be after start date');
    }

    // Check if vendor exists
    const vendor = await User.findByPk(vendorId);
    if (!vendor || vendor.type !== 'vendor') {
      throw new Error('Vendor not found');
    }

    // Validate products - products is now just an array of product IDs
    const productIds = Array.isArray(productsArray) ? productsArray : [];
    if (productIds.length === 0) {
      throw new Error('Products array must contain at least one product ID');
    }

    // Ensure productIds are integers
    const normalizedProductIds = productIds.map(id => {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numId)) {
        throw new Error(`Invalid product ID: ${id}`);
      }
      return numId;
    });

    console.log('Creating discount for vendorId:', vendorId);
    console.log('Product IDs to validate:', normalizedProductIds);

    // First, check if products exist (regardless of vendor)
    const allProductsCheck = await Product.findAll({
      where: {
        id: { [Op.in]: normalizedProductIds }
      },
      attributes: ['id', 'vendorId']
    });

    console.log('All products found (any vendor):', allProductsCheck.map(p => ({ id: p.id, vendorId: p.vendorId })));

    // Check if all products exist
    const foundProductIds = allProductsCheck.map(p => p.id);
    const notFoundProducts = normalizedProductIds.filter(id => !foundProductIds.includes(id));
    
    if (notFoundProducts.length > 0) {
      throw new Error(`Products [${notFoundProducts.join(', ')}] do not exist.`);
    }

    // Check if products belong to the current vendor
    const existingProducts = allProductsCheck.filter(p => p.vendorId === vendorId);
    const wrongVendorProducts = allProductsCheck.filter(p => p.vendorId !== vendorId && p.vendorId !== null);
    const productsWithNoOwner = allProductsCheck.filter(p => p.vendorId === null);

    console.log('Products belonging to vendor:', existingProducts.map(p => ({ id: p.id, vendorId: p.vendorId })));
    console.log('Products NOT belonging to vendor:', wrongVendorProducts.map(p => ({ id: p.id, vendorId: p.vendorId })));
    console.log('Products with no owner:', productsWithNoOwner.map(p => ({ id: p.id, vendorId: p.vendorId })));

    // If there are products that don't belong to this vendor, try to fix them if they have no owner
    if (productsWithNoOwner.length > 0) {
      console.log('Fixing products with null vendorId:', productsWithNoOwner.map(p => p.id));
      // Update products with null vendorId to current vendor
      await Product.update(
        { vendorId: vendorId },
        { where: { id: { [Op.in]: productsWithNoOwner.map(p => p.id) } } }
      );
    }

    // Check again after fixing null vendorIds
    if (wrongVendorProducts.length > 0) {
      const vendorInfo = wrongVendorProducts.map(p => `Product ${p.id} belongs to vendor ${p.vendorId}`).join(', ');
      throw new Error(`Products [${wrongVendorProducts.map(p => p.id).join(', ')}] belong to a different vendor (${vendorInfo}). You can only create discounts for your own products. Please update the product's vendorId first using PUT /api/v1/products/${wrongVendorProducts[0].id} with vendorId=${vendorId}, or use products that belong to you (vendor ${vendorId}). Use GET /api/v1/products/my to see your products.`);
    }

    // Check if any product is already in an active discount that overlaps with the new discount period
    const existingDiscountProducts = await DiscountProduct.findAll({
      where: {
        productId: { [Op.in]: normalizedProductIds }
      },
      include: [{
        model: Discount,
        as: 'discount',
        where: {
          isActive: true,
          [Op.or]: [
            // Discount starts before new discount ends and ends after new discount starts (overlap)
            {
              startDate: { [Op.lte]: end },
              endDate: { [Op.gte]: start }
            }
          ]
        }
      }]
    });

    if (existingDiscountProducts.length > 0) {
      const conflictingProducts = existingDiscountProducts.map(dp => dp.productId);
      throw new Error(`Products with IDs [${conflictingProducts.join(', ')}] are already in an active discount`);
    }

    // Create discount
    const discountRecord = await Discount.create({
      vendorId,
      title,
      body: body || null,
      image: image || null,
      startDate: start,
      endDate: end,
      discount: discountPercent,
      isActive: true
    });

    // Create discount products (just product IDs, no discountedPrice)
    const discountProducts = await DiscountProduct.bulkCreate(
      normalizedProductIds.map(productId => ({
        discountId: discountRecord.id,
        productId: productId
      }))
    );

    // Fetch discount with relations
    const discountWithRelations = await Discount.findByPk(discountRecord.id, {
      attributes: ['id', 'vendorId', 'title', 'body', 'image', 'startDate', 'endDate', 'discount', 'isActive', 'createdAt', 'updatedAt'],
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: DiscountProduct,
          as: 'products',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'price', 'images']
          }]
        }
      ]
    });

    return discountWithRelations;
  }

  /**
   * Get all discounts for a vendor
   * @param {number} vendorId - Vendor ID
   * @returns {Promise<array>}
   */
  async getVendorDiscounts(vendorId) {
    const discounts = await Discount.findAll({
      where: { vendorId },
      attributes: ['id', 'vendorId', 'title', 'body', 'image', 'startDate', 'endDate', 'discount', 'isActive', 'createdAt', 'updatedAt'],
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: DiscountProduct,
          as: 'products',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'price', 'images']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return discounts;
  }

  /**
   * Get all active discounts (for users) with filters
   * @param {object} filters - Filter options (governmentId, categoryId, minPrice, maxPrice)
   * @returns {Promise<array>}
   */
  async getAllActiveDiscounts(filters = {}) {
    const now = new Date();
    const { governmentId, categoryId, minPrice, maxPrice } = filters;

    // Build vendor filter
    const vendorWhere = {};
    if (governmentId) {
      vendorWhere.governmentId = parseInt(governmentId);
    }

    // Build product filter
    const productWhere = {};
    if (categoryId) {
      productWhere.categoryId = parseInt(categoryId);
    }

    // Build discount include with nested filters
    const discountInclude = [
      {
        model: User,
        as: 'vendor',
        attributes: ['id', 'name', 'email', 'logoImage', 'governmentId'],
        where: Object.keys(vendorWhere).length > 0 ? vendorWhere : undefined,
        required: Object.keys(vendorWhere).length > 0,
        include: [{
          model: Government,
          as: 'government',
          attributes: ['id', 'name']
        }]
      },
      {
        model: DiscountProduct,
        as: 'products',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price', 'images', 'categoryId'],
          where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
          required: Object.keys(productWhere).length > 0,
          include: [{
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          }]
        }]
      }
    ];

    const discounts = await Discount.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
      },
      attributes: ['id', 'vendorId', 'title', 'body', 'image', 'startDate', 'endDate', 'discount', 'isActive', 'createdAt', 'updatedAt'],
      include: discountInclude,
      order: [['createdAt', 'DESC']]
    });

    // Filter by price if minPrice or maxPrice is provided
    let filteredDiscounts = discounts;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filteredDiscounts = discounts.filter(discount => {
        // Check if any product in the discount matches the price range
        return discount.products.some(discountProduct => {
          if (!discountProduct.product || !discountProduct.product.price) {
            return false;
          }

          const originalPrice = parseFloat(discountProduct.product.price);
          const discountPercent = parseFloat(discount.discount);
          const discountedPrice = originalPrice * (1 - discountPercent / 100);

          const min = minPrice !== undefined ? parseFloat(minPrice) : 0;
          const max = maxPrice !== undefined ? parseFloat(maxPrice) : Infinity;

          return discountedPrice >= min && discountedPrice <= max;
        });
      });
    }

    return filteredDiscounts;
  }

  /**
   * Get discounts by vendor ID (for users)
   * @param {number} vendorId - Vendor ID
   * @returns {Promise<array>}
   */
  async getDiscountsByVendorId(vendorId) {
    const now = new Date();
    
    const discounts = await Discount.findAll({
      where: {
        vendorId: vendorId,
        isActive: true,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
      },
      attributes: ['id', 'vendorId', 'title', 'body', 'image', 'startDate', 'endDate', 'discount', 'isActive', 'createdAt', 'updatedAt'],
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email', 'logoImage']
        },
        {
          model: DiscountProduct,
          as: 'products',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'price', 'images']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return discounts;
  }

  /**
   * Get discount by ID
   * @param {number} discountId - Discount ID
   * @param {number} vendorId - Vendor ID (optional, for security)
   * @returns {Promise<object>}
   */
  async getDiscountById(discountId, vendorId = null) {
    const where = { id: discountId };
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const discount = await Discount.findOne({
      where,
      attributes: ['id', 'vendorId', 'title', 'body', 'image', 'startDate', 'endDate', 'discount', 'isActive', 'createdAt', 'updatedAt'],
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: DiscountProduct,
          as: 'products',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'price', 'images']
          }]
        }
      ]
    });

    if (!discount) {
      throw new Error('Discount not found');
    }

    return discount;
  }

  /**
   * Update discount
   * @param {number} discountId - Discount ID
   * @param {number} vendorId - Vendor ID
   * @param {object} updateData - Update data
   * @returns {Promise<object>}
   */
  async updateDiscount(discountId, vendorId, updateData) {
    const discount = await Discount.findOne({
      where: { id: discountId, vendorId }
    });

    if (!discount) {
      throw new Error('Discount not found');
    }

    const { title, body, image, startDate, endDate, products } = updateData;

    // Validate date range if both dates are provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        throw new Error('End date must be after start date');
      }
    }

    // Update discount fields
    if (title !== undefined) discount.title = title;
    if (body !== undefined) discount.body = body;
    if (image !== undefined) discount.image = image;
    if (startDate !== undefined) discount.startDate = new Date(startDate);
    if (endDate !== undefined) discount.endDate = new Date(endDate);
    if (discount !== undefined && discount !== null) {
      const discountPercent = parseFloat(discount);
      if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        throw new Error('Discount must be a number between 0 and 100');
      }
      discount.discount = discountPercent;
    }

    await discount.save();

    // Update products if provided
    if (products !== undefined) {
      // Handle products - ensure it's an array
      let productsArray = products;
      if (typeof products === 'string') {
        try {
          productsArray = JSON.parse(products);
        } catch (e) {
          throw new Error('Products must be a valid array');
        }
      }

      if (!Array.isArray(productsArray) || productsArray.length === 0) {
        throw new Error('Products must be a valid non-empty array');
      }

      // Delete existing discount products
      await DiscountProduct.destroy({
        where: { discountId: discount.id }
      });

      // Validate products - products is now just an array of product IDs
      const productIds = productsArray;
      const existingProducts = await Product.findAll({
        where: {
          id: { [Op.in]: productIds },
          vendorId: vendorId
        }
      });

      if (existingProducts.length !== productIds.length) {
        throw new Error('Some products not found or do not belong to this vendor');
      }

      // Check if any product is already in another active discount
      const existingDiscountProducts = await DiscountProduct.findAll({
        where: {
          productId: { [Op.in]: productIds },
          discountId: { [Op.ne]: discountId } // Exclude current discount
        },
        include: [{
          model: Discount,
          as: 'discount',
          where: {
            isActive: true,
            [Op.or]: [
              {
                startDate: { [Op.lte]: discount.endDate },
                endDate: { [Op.gte]: discount.startDate }
              }
            ]
          }
        }]
      });

      if (existingDiscountProducts.length > 0) {
        const conflictingProducts = existingDiscountProducts.map(dp => dp.productId);
        throw new Error(`Products with IDs [${conflictingProducts.join(', ')}] are already in an active discount`);
      }

      // Create new discount products (just product IDs)
      await DiscountProduct.bulkCreate(
        productIds.map(productId => ({
          discountId: discount.id,
          productId: productId
        }))
      );
    }

    // Fetch updated discount with relations
    return await this.getDiscountById(discountId, vendorId);
  }

  /**
   * Delete discount
   * @param {number} discountId - Discount ID
   * @param {number} vendorId - Vendor ID
   * @returns {Promise<object>}
   */
  async deleteDiscount(discountId, vendorId) {
    const discount = await Discount.findOne({
      where: { id: discountId, vendorId }
    });

    if (!discount) {
      throw new Error('Discount not found');
    }

    await discount.destroy();

    return { message: 'Discount deleted successfully' };
  }

  /**
   * Get active discounts for products
   * @param {array} productIds - Product IDs
   * @returns {Promise<array>}
   */
  async getActiveDiscountsForProducts(productIds) {
    const now = new Date();
    
    const discountProducts = await DiscountProduct.findAll({
      where: {
        productId: { [Op.in]: productIds }
      },
      include: [{
        model: Discount,
        as: 'discount',
        where: {
          isActive: true,
          startDate: { [Op.lte]: now },
          endDate: { [Op.gte]: now }
        }
      }]
    });

    return discountProducts;
  }

  /**
   * Check if a product is in an active discount
   * @param {number} productId - Product ID
   * @returns {Promise<object|null>}
   */
  async checkProductInDiscount(productId) {
    const now = new Date();
    
    const discountProduct = await DiscountProduct.findOne({
      where: {
        productId: productId
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
          include: [{
            model: User,
            as: 'vendor',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'price']
        }
      ]
    });

    if (!discountProduct) {
      return null;
    }

    // Calculate discounted price based on discount percentage
    const discountPercent = parseFloat(discountProduct.discount.discount);
    const originalPrice = parseFloat(discountProduct.product.price);
    const discountedPrice = originalPrice * (1 - discountPercent / 100);

    return {
      inDiscount: true,
      discount: discountProduct.discount,
      discountPercentage: discountPercent,
      originalPrice: originalPrice,
      discountedPrice: parseFloat(discountedPrice.toFixed(2)),
      product: discountProduct.product
    };
  }

  /**
   * Delete expired discounts (discounts where endDate has passed)
   * This is called by cron job
   * @returns {Promise<object>}
   */
  async deleteExpiredDiscounts() {
    const now = new Date();
    
    // Find all expired discounts
    const expiredDiscounts = await Discount.findAll({
      where: {
        endDate: { [Op.lt]: now }
      },
      include: [{
        model: DiscountProduct,
        as: 'products'
      }]
    });

    if (expiredDiscounts.length === 0) {
      return {
        deletedCount: 0,
        discounts: []
      };
    }

    const discountIds = expiredDiscounts.map(d => d.id);
    
    // Delete discount products first (due to foreign key constraint)
    const deletedProductsCount = await DiscountProduct.destroy({
      where: {
        discountId: { [Op.in]: discountIds }
      }
    });

    // Delete expired discounts
    const deletedCount = await Discount.destroy({
      where: {
        id: { [Op.in]: discountIds }
      }
    });

    return {
      deletedCount,
      deletedProductsCount,
      discounts: expiredDiscounts.map(d => ({
        id: d.id,
        title: d.title,
        endDate: d.endDate
      }))
    };
  }
}

export default new DiscountService();

