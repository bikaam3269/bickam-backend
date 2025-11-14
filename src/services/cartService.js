import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';



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

    return cartItems;
  }

  async addToCart(userId, productId, quantity = 1) {
    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if item already in cart
    const existingCartItem = await Cart.findOne({
      where: { userId, productId }
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
      quantity
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
}

export default new CartService();

