import MarketingCart from '../models/MarketingCart.js';
import MarketingProduct from '../models/MarketingProduct.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import Government from '../models/Government.js';
import City from '../models/City.js';

class MarketingCartService {
  /**
   * Get marketing cart for a marketer
   */
  async getCart(marketerId) {
    // Verify user is a marketer
    const marketer = await User.findByPk(marketerId);
    if (!marketer || marketer.type !== 'marketing') {
      throw new Error('User is not a marketer');
    }

    const cartItems = await MarketingCart.findAll({
      where: { marketerId },
      include: [{
        model: MarketingProduct,
        as: 'marketingProduct',
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
            attributes: ['id', 'name', 'code']
          },
          {
            model: City,
            as: 'city',
            attributes: ['id', 'name']
          }
        ]
      }],
      order: [['createdAt', 'DESC']]
    });

    return cartItems;
  }

  /**
   * Add marketing product to cart
   */
  async addToCart(marketerId, marketingProductId, quantity = 1) {
    // Verify user is a marketer
    const marketer = await User.findByPk(marketerId);
    if (!marketer || marketer.type !== 'marketing') {
      throw new Error('User is not a marketer');
    }

    // Check if marketing product exists and is active
    const marketingProduct = await MarketingProduct.findByPk(marketingProductId);
    if (!marketingProduct) {
      throw new Error('Marketing product not found');
    }

    if (!marketingProduct.isActive) {
      throw new Error('Marketing product is not active');
    }

    // Check if item already exists in cart
    const existingCartItem = await MarketingCart.findOne({
      where: {
        marketerId,
        marketingProductId
      }
    });

    if (existingCartItem) {
      // Update quantity
      existingCartItem.quantity += quantity;
      await existingCartItem.save();
      return existingCartItem;
    }

    // Create new cart item
    const cartItem = await MarketingCart.create({
      marketerId,
      marketingProductId,
      quantity
    });

    return cartItem;
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(marketerId, cartItemId, quantity) {
    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    const cartItem = await MarketingCart.findOne({
      where: {
        id: cartItemId,
        marketerId
      }
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    return cartItem;
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(marketerId, cartItemId) {
    const cartItem = await MarketingCart.findOne({
      where: {
        id: cartItemId,
        marketerId
      }
    });

    if (!cartItem) {
      throw new Error('Cart item not found');
    }

    await cartItem.destroy();
    return true;
  }

  /**
   * Clear cart for a marketer
   */
  async clearCart(marketerId) {
    await MarketingCart.destroy({
      where: { marketerId }
    });
    return true;
  }
}

export default new MarketingCartService();






