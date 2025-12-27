import { Op } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import Favorite from '../models/Favorite.js';
import Cart from '../models/Cart.js';
import notificationService from './notificationService.js';
import favoriteService from './favoriteService.js';

class ProductService {
  async getAllProducts(filters = {}) {
    const { 
      vendorId, 
      categoryId, 
      subcategoryId, 
      search, 
      minPrice, 
      maxPrice, 
      isActive, 
      minQuantity,
      governmentId,
      page = 1,
      limit = 50,
      status // 'published', 'pending', 'rejected' - based on isActive
    } = filters;
    
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

    // Filter by isActive status
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Filter by status (published = isActive=true, pending/rejected = isActive=false)
    // Note: This is a simplified status system. You may want to add a proper status field later.
    if (status === 'published') {
      where.isActive = true;
    } else if (status === 'pending' || status === 'rejected') {
      where.isActive = false;
    }

    // Filter by minimum quantity
    if (minQuantity !== undefined) {
      where.quantity = { [Op.gte]: minQuantity };
    }

    // Build include array for vendor
    const vendorInclude = {
      model: User,
      as: 'vendor',
      attributes: ['id', 'name', 'email', 'type'],
      required: governmentId !== undefined // If filtering by government, make vendor required
    };

    // Filter by government (governate) through vendor
    if (governmentId !== undefined) {
      vendorInclude.where = {
        governmentId: governmentId
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get products with pagination
    const products = await Product.findAndCountAll({
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
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      distinct: true // Important when using includes with where conditions
    });

    // Get total count from findAndCountAll result
    const totalCount = products.count;

    // Ensure images is always returned as an array, not a stringified array
    const formattedProducts = products.rows.map(product => {
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
      // Add status based on isActive (simplified - you may want to add proper status field)
      productData.status = productData.isActive ? 'published' : 'pending';
      return productData;
    });

    return {
      products: formattedProducts,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasMore: offset + formattedProducts.length < totalCount
      }
    };
  }

  async getProductById(id, userId = null) {
    const product = await Product.findByPk(id, {
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email', 'type', 'logoImage', 'whatsappNumber']
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

    // Ensure images is always returned as an array, not a stringified array
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

    // Check if product is in cart
    if (userId) {
      const cartItem = await Cart.findOne({
        where: {
          userId,
          productId: id
        }
      });
      productData.isCart = !!cartItem;
    } else {
      productData.isCart = false;
    }

    // Check if product is in favorites
    if (userId) {
      const favorite = await Favorite.findOne({
        where: {
          userId,
          productId: id
        }
      });
      productData.isFavorite = !!favorite;
    } else {
      productData.isFavorite = false;
    }

    // Get similar products
    const similarProducts = await this.getSimilarProducts(id, product.categoryId, product.subcategoryId, 8);

    // Format similar products
    const formattedSimilarProducts = similarProducts.map(p => {
      const pData = p.toJSON ? p.toJSON() : p;
      // Ensure images is always an array
      if (pData.images) {
        if (typeof pData.images === 'string') {
          try {
            pData.images = JSON.parse(pData.images);
          } catch (e) {
            pData.images = [];
          }
        }
        if (!Array.isArray(pData.images)) {
          pData.images = [];
        }
      } else {
        pData.images = [];
      }
      return pData;
    });

    productData.similarProducts = formattedSimilarProducts;

    return productData;
  }

  /**
   * Get similar products based on category and subcategory
   * @param {number} excludeProductId - Product ID to exclude
   * @param {number} categoryId - Category ID
   * @param {number} subcategoryId - Subcategory ID
   * @param {number} limit - Maximum number of similar products to return
   * @returns {Promise<Array>}
   */
  async getSimilarProducts(excludeProductId, categoryId, subcategoryId, limit = 8) {
    const where = {
      id: { [Op.ne]: excludeProductId }, // Exclude current product
      isActive: true
    };

    // Priority: same subcategory, then same category
    const similarProducts = await Product.findAll({
      where: {
        ...where,
        [Op.or]: [
          { subcategoryId: subcategoryId }, // Same subcategory (highest priority)
          { categoryId: categoryId } // Same category (lower priority)
        ]
      },
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email', 'type', 'logoImage', 'whatsappNumber']
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
      order: [
        // Prioritize same subcategory
        [sequelize.literal(`CASE WHEN subcategory_id = ${subcategoryId} THEN 0 ELSE 1 END`), 'ASC'],
        ['createdAt', 'DESC']
      ],
      limit: parseInt(limit)
    });

    return similarProducts;
  }

  async createProduct(data) {
    const { name, images, price, isPrice, description, categoryId, subcategoryId, discount, quantity, isActive } = data;

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

    // Validate quantity
    if (quantity !== undefined && quantity < 0) {
      throw new Error('Quantity must be greater than or equal to 0');
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
      discount: discount || 0,
      quantity: quantity !== undefined ? parseInt(quantity) : 0,
      isActive: isActive !== undefined ? (isActive === true || isActive === 'true' || isActive === 1 || isActive === '1') : true
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
    // Exception: If vendorId is null or product has no owner, vendor can claim it
    if (product.vendorId && currentUser.type !== 'admin' && currentUser.id !== product.vendorId) {
      throw new Error('Unauthorized to update this product');
    }

    // If vendor is trying to update vendorId, only allow if:
    // 1. Current vendorId is null (unclaimed product)
    // 2. Current vendorId matches the user (transferring to themselves - no change)
    // 3. User is admin
    if (data.vendorId !== undefined && currentUser.type === 'vendor') {
      if (product.vendorId !== null && product.vendorId !== currentUser.id) {
        throw new Error('Cannot change product owner. Product already belongs to another vendor.');
      }
      // If product has no owner or belongs to current user, allow setting vendorId
      if (product.vendorId === null || product.vendorId === currentUser.id) {
        data.vendorId = currentUser.id; // Force to current user's ID for security
      }
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

  async approveProduct(id) {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new Error('Product not found');
    }

    product.isActive = true;
    await product.save();

    return await this.getProductById(product.id);
  }

  async rejectProduct(id) {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new Error('Product not found');
    }

    product.isActive = false;
    await product.save();

    return await this.getProductById(product.id);
  }

  async hideProduct(id) {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new Error('Product not found');
    }

    product.isActive = false;
    await product.save();

    return await this.getProductById(product.id);
  }

  async getProductsByVendor(vendorId, page = 1, limit = 10, subcategoryId = null, isActive = undefined, sortBy = 'latest', currentUserId = null) {
    const offset = (page - 1) * limit;

    // Build where clause for products
    const where = { vendorId };
    if (subcategoryId) {
      where.subcategoryId = subcategoryId;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Determine sorting order
    let order = [];
    switch (sortBy) {
      case 'price_asc':
        order = [['price', 'ASC'], ['createdAt', 'DESC']];
        break;
      case 'price_desc':
        order = [['price', 'DESC'], ['createdAt', 'DESC']];
        break;
      case 'offers':
        // Sort by discount (highest discount first), then by price
        order = [
          [sequelize.literal('CASE WHEN discount > 0 THEN 0 ELSE 1 END'), 'ASC'],
          ['discount', 'DESC'],
          ['price', 'ASC'],
          ['createdAt', 'DESC']
        ];
        break;
      case 'latest':
      default:
        order = [['createdAt', 'DESC']];
        break;
    }

    const { count, rows } = await Product.findAndCountAll({
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
        }
      ],
      order,
      limit,
      offset
    });

    // Get favorite and cart status for all products if user is authenticated
    let favoriteProductIds = new Set();
    let cartProductIds = new Set();
    if (currentUserId) {
      // Get all product IDs
      const productIds = rows.map(p => p.id);
      if (productIds.length > 0) {
        // Get favorite product IDs
        const favorites = await Favorite.findAll({
          where: {
            userId: currentUserId,
            productId: { [Op.in]: productIds }
          },
          attributes: ['productId']
        });
        favoriteProductIds = new Set(favorites.map(fav => fav.productId));

        // Get cart product IDs
        const cartItems = await Cart.findAll({
          where: {
            userId: currentUserId,
            productId: { [Op.in]: productIds }
          },
          attributes: ['productId']
        });
        cartProductIds = new Set(cartItems.map(item => item.productId));
      }
    }

    // Add isFavorite and isCart to each product
    const productsWithFavorite = rows.map(product => {
      const productData = product.toJSON ? product.toJSON() : product;
      productData.isFavorite = currentUserId ? favoriteProductIds.has(product.id) : false;
      productData.isCart = currentUserId ? cartProductIds.has(product.id) : false;
      // Ensure images is always returned as an array, not a stringified array
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
      return productData;
    });

    // Extract unique subcategories from all products (not just current page)
    // Apply same filter to get relevant subcategories
    const subcategoryWhere = { vendorId };
    if (subcategoryId) {
      subcategoryWhere.subcategoryId = subcategoryId;
    }

    const allProducts = await Product.findAll({
      where: subcategoryWhere,
      include: [
        {
          model: Subcategory,
          as: 'subcategory',
          attributes: ['id', 'name']
        }
      ],
      attributes: ['subcategoryId']
    });

    // Get unique subcategories
    const subcategoriesMap = new Map();
    allProducts.forEach(product => {
      if (product.subcategory) {
        subcategoriesMap.set(product.subcategory.id, {
          id: product.subcategory.id,
          name: product.subcategory.name
        });
      }
    });
    const subcategories = Array.from(subcategoriesMap.values());

    const totalPages = Math.ceil(count / limit);

    return {
      products: productsWithFavorite,
      subcategories,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages
      }
    };
  }

  async getMyProducts(vendorId, page = 1, limit = 10, categoryId = null, isActive = undefined) {
    const offset = (page - 1) * limit;

    console.log('Service: Querying products with vendorId:', vendorId);
    console.log('Service: CategoryId filter:', categoryId);
    console.log('Service: Pagination - page:', page, 'limit:', limit, 'offset:', offset);

    // Build where clause
    const where = { vendorId };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const { count, rows } = await Product.findAndCountAll({
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
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    console.log('Service: Found', count, 'total products');
    console.log('Service: Returned', rows.length, 'products for this page');

    // Ensure images is always returned as an array, not a stringified array
    const products = rows.map(product => {
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
      return productData;
    });

    const totalPages = Math.ceil(count / limit);

    return {
      products,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages
      }
    };
  }

  async getSimilarProducts(productId, limit = 10, userId = null) {
    // Get the product first
    const product = await Product.findByPk(productId, {
      attributes: ['id', 'categoryId', 'subcategoryId', 'vendorId']
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const { categoryId, subcategoryId, vendorId } = product;

    // Build where clause to find similar products
    // Priority: same subcategory > same category > same vendor
    const where = {
      id: { [Op.ne]: productId }, // Exclude the current product
      isActive: true // Only active products
    };

    // Try to find products with same subcategory first
    let similarProducts = await Product.findAll({
      where: {
        ...where,
        subcategoryId: subcategoryId
      },
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email', 'type', 'logoImage', 'whatsappNumber']
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
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // If not enough products, add products from same category
    if (similarProducts.length < limit) {
      const remainingLimit = parseInt(limit) - similarProducts.length;
      const existingIds = similarProducts.map(p => p.id);
      existingIds.push(productId);

      const categoryProducts = await Product.findAll({
        where: {
          ...where,
          categoryId: categoryId,
          id: { [Op.notIn]: existingIds }
        },
        include: [
          {
            model: User,
            as: 'vendor',
            attributes: ['id', 'name', 'email', 'type', 'logoImage', 'whatsappNumber']
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
        order: [['createdAt', 'DESC']],
        limit: remainingLimit
      });

      similarProducts = [...similarProducts, ...categoryProducts];
    }

    // If still not enough, add products from same vendor
    if (similarProducts.length < limit && vendorId) {
      const remainingLimit = parseInt(limit) - similarProducts.length;
      const existingIds = similarProducts.map(p => p.id);
      existingIds.push(productId);

      const vendorProducts = await Product.findAll({
        where: {
          ...where,
          vendorId: vendorId,
          id: { [Op.notIn]: existingIds }
        },
        include: [
          {
            model: User,
            as: 'vendor',
            attributes: ['id', 'name', 'email', 'type', 'logoImage', 'whatsappNumber']
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
        order: [['createdAt', 'DESC']],
        limit: remainingLimit
      });

      similarProducts = [...similarProducts, ...vendorProducts];
    }

    // Get favorite and cart status for all products if user is authenticated
    let favoriteProductIds = new Set();
    let cartProductIds = new Set();
    if (userId && similarProducts.length > 0) {
      const productIds = similarProducts.map(p => p.id);
      if (productIds.length > 0) {
        // Get favorite product IDs
        const favorites = await Favorite.findAll({
          where: {
            userId: userId,
            productId: { [Op.in]: productIds }
          },
          attributes: ['productId']
        });
        favoriteProductIds = new Set(favorites.map(fav => fav.productId));

        // Get cart product IDs
        const cartItems = await Cart.findAll({
          where: {
            userId: userId,
            productId: { [Op.in]: productIds }
          },
          attributes: ['productId']
        });
        cartProductIds = new Set(cartItems.map(item => item.productId));
      }
    }

    // Format products with images, isFavorite, and isCart
    const formattedProducts = similarProducts.map(product => {
      const productData = product.toJSON ? product.toJSON() : product;
      
      // Ensure images is always returned as an array
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

      // Add isFavorite and isCart
      productData.isFavorite = userId ? favoriteProductIds.has(product.id) : false;
      productData.isCart = userId ? cartProductIds.has(product.id) : false;

      return productData;
    });

    return formattedProducts;
  }
}

export default new ProductService();

