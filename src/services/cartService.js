import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import DiscountProduct from '../models/DiscountProduct.js';
import Discount from '../models/Discount.js';
import { Op } from 'sequelize';



class CartService {
  async getCart(userId) {
    const cartItems = await Cart.findAll({
      where: { userId },
      include: [{
        model: Product,
        as: 'product',
        include: [
          {
            model: User,
            as: 'vendor',
            attributes: ['id', 'name', 'email']
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
      }],
      order: [['createdAt', 'DESC']]
    });

    // Calculate finalPrice, originalPrice, priceAfterDiscount for each cart item
    const now = new Date();
    const productIds = cartItems.map(item => item.productId);
    
    // Get active discounts for all products in cart
    const discountProducts = productIds.length > 0 ? await DiscountProduct.findAll({
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
    }) : [];

    // Create a map of productId -> discount percentage
    const discountMap = new Map();
    discountProducts.forEach(dp => {
      if (dp.discount) {
        discountMap.set(dp.productId, parseFloat(dp.discount.discount || 0));
      }
    });

    // Format cart items with price calculations
    const formattedCartItems = cartItems.map(item => {
      const cartItemData = item.toJSON ? item.toJSON() : item;
      const product = cartItemData.product;

      if (product) {
        const price = product.price && product.isPrice ? parseFloat(product.price) : 0;
        let discountPercentage = 0;
        
        // Check active discount first, then product discount field
        if (discountMap.has(product.id)) {
          discountPercentage = discountMap.get(product.id);
        } else if (product.discount) {
          discountPercentage = parseFloat(product.discount || 0);
        }
        
        const originalPrice = price;
        const finalPrice = discountPercentage > 0 
          ? price * (1 - discountPercentage / 100)
          : price;
        
        // Add price fields to product
        product.originalPrice = parseFloat(originalPrice.toFixed(2));
        product.finalPrice = parseFloat(finalPrice.toFixed(2));
        product.priceAfterDiscount = parseFloat(finalPrice.toFixed(2));
        product.isDiscount = discountPercentage > 0;
      }

      return cartItemData;
    });

    return formattedCartItems;
  }

  async addToCart(userId, productId, quantity = 1, size = null, color = null) {
    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.vendorId) {
      throw new Error('Product has no vendor');
    }

    // Validate size and color if provided
    if (size !== null && product.sizes && product.sizes.length > 0) {
      if (!product.sizes.includes(size)) {
        throw new Error(`Invalid size. Available sizes: ${product.sizes.join(', ')}`);
      }
    }

    if (color !== null && product.colors && product.colors.length > 0) {
      if (!product.colors.includes(color)) {
        throw new Error(`Invalid color. Available colors: ${product.colors.join(', ')}`);
      }
    }

    // Get all cart items to check vendor
    const cartItems = await Cart.findAll({
      where: { userId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'vendorId']
      }]
    });

    // Check if cart has items from different vendor
    if (cartItems.length > 0) {
      const firstCartItem = cartItems[0];
      const firstVendorId = firstCartItem.product?.vendorId;

      if (!firstVendorId) {
        throw new Error('Cart contains product with no vendor');
      }

      // Check if new product is from different vendor
      if (product.vendorId !== firstVendorId) {
        throw new Error(`Cannot add product from different vendor. Cart already contains products from vendor ${firstVendorId}. Please clear cart first or complete current order.`);
      }
    }

    // Build where condition for existing cart item (handle null values properly)
    const whereCondition = {
      userId,
      productId
    };

    // For MySQL/Sequelize, we need to handle null values explicitly using Op.is or Op.eq
    if (size !== null && size !== undefined && size !== '') {
      whereCondition.size = size;
    } else {
      whereCondition.size = { [Op.is]: null };
    }

    if (color !== null && color !== undefined && color !== '') {
      whereCondition.color = color;
    } else {
      whereCondition.color = { [Op.is]: null };
    }

    // Check if item already in cart with same size and color
    const existingCartItem = await Cart.findOne({
      where: whereCondition
    });

    if (existingCartItem) {
      // Update quantity
      existingCartItem.quantity += quantity;
      await existingCartItem.save();
      return existingCartItem;
    }

    // Create new cart item
    const cartItem = await Cart.create({
      userId,
      productId,
      quantity,
      size: size || null,
      color: color || null
    });

    return cartItem;
  }

  async updateCartItem(userId, cartItemId, quantity) {
    const cartItem = await Cart.findOne({
      where: { id: cartItemId, userId }
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    if (quantity <= 0) {
      await cartItem.destroy();
      return { message: 'Item removed from cart' };
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    return cartItem;
  }

  async removeFromCart(userId, cartItemId) {
    const cartItem = await Cart.findOne({
      where: { id: cartItemId, userId }
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    await cartItem.destroy();
    return { message: 'Item removed from cart' };
  }

  async clearCart(userId) {
    await Cart.destroy({
      where: { userId }
    });

    return { message: 'Cart cleared' };
  }

  async getCartTotal(userId) {
    const cartItems = await this.getCart(userId);
    let total = 0;

    for (const item of cartItems) {
      const product = item.product;
      if (product.price && product.isPrice) {
        const itemPrice = parseFloat(product.price);
        const discount = product.discount || 0;
        const discountedPrice = itemPrice * (1 - discount / 100);
        total += discountedPrice * item.quantity;
      }
    }

    return total;
  }

  /**
   * Get cart items count for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} - Total number of items in cart
   */
  async getCartItemsCount(userId) {
    const count = await Cart.count({
      where: { userId }
    });

    return count;
  }
}

export default new CartService();

