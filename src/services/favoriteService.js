import Favorite from '../models/Favorite.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import notificationService from './notificationService.js';

class FavoriteService {
  async getFavorites(userId) {
    const favorites = await Favorite.findAll({
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

    return favorites.map(fav => fav.product);
  }

  async addToFavorites(userId, productId) {
    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if already in favorites
    const existingFavorite = await Favorite.findOne({
      where: { userId, productId }
    });

    if (existingFavorite) {
      throw new Error('Product already in favorites');
    }

    // Create favorite
    const favorite = await Favorite.create({
      userId,
      productId
    });

    // Notify vendor about product being favorited
    try {
      const user = await User.findByPk(userId);
      if (product.vendorId && user) {
        await notificationService.notifyProductFavorited(
          product.vendorId,
          productId,
          product.name,
          user.name
        );
      }
    } catch (error) {
      console.error('Failed to notify vendor about product favorite:', error.message);
    }

    return favorite;
  }

  async removeFromFavorites(userId, productId) {
    const favorite = await Favorite.findOne({
      where: { userId, productId }
    });

    if (!favorite) {
      throw new Error('Product not in favorites');
    }

    await favorite.destroy();
    return { message: 'Product removed from favorites' };
  }

  async isFavorite(userId, productId) {
    const favorite = await Favorite.findOne({
      where: { userId, productId }
    });

    return !!favorite;
  }
}

export default new FavoriteService();

