import { Op } from 'sequelize';
import VendorRating from '../models/VendorRating.js';
import User from '../models/User.js';
import Order from '../models/Order.js';

class RatingService {
  /**
   * Rate a vendor
   * @param {number} userId - User ID who is rating
   * @param {number} vendorId - Vendor ID being rated
   * @param {number} rating - Rating value (1-5)
   * @param {string} comment - Optional comment
   * @param {number} orderId - Optional order ID
   */
  async rateVendor(userId, vendorId, rating, comment = null, orderId = null) {
    // Validate rating value
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if vendor exists and is actually a vendor
    const vendor = await User.findByPk(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    if (vendor.type !== 'vendor') {
      throw new Error('User is not a vendor');
    }

    // Check if user is trying to rate themselves
    if (userId === vendorId) {
      throw new Error('You cannot rate yourself');
    }

    // Check if order exists (if provided)
    if (orderId) {
      const order = await Order.findByPk(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      if (order.userId !== userId) {
        throw new Error('Order does not belong to you');
      }
      if (order.vendorId !== vendorId) {
        throw new Error('Order does not belong to this vendor');
      }
    }

    // Check if user already rated this vendor
    const existingRating = await VendorRating.findOne({
      where: { userId, vendorId }
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      if (comment !== null) existingRating.comment = comment;
      if (orderId !== null) existingRating.orderId = orderId;
      await existingRating.save();
      return existingRating;
    }

    // Create new rating
    const vendorRating = await VendorRating.create({
      userId,
      vendorId,
      rating,
      comment,
      orderId
    });

    return vendorRating;
  }

  /**
   * Get vendor ratings
   * @param {number} vendorId - Vendor ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   */
  async getVendorRatings(vendorId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { count, rows } = await VendorRating.findAndCountAll({
      where: { vendorId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'logoImage', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    // Calculate average rating
    const ratings = await VendorRating.findAll({
      where: { vendorId },
      attributes: ['rating']
    });

    const totalRatings = ratings.length;
    const sumRatings = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(2) : 0;

    // Count ratings by value
    const ratingDistribution = {
      5: ratings.filter(r => r.rating === 5).length,
      4: ratings.filter(r => r.rating === 4).length,
      3: ratings.filter(r => r.rating === 3).length,
      2: ratings.filter(r => r.rating === 2).length,
      1: ratings.filter(r => r.rating === 1).length
    };

    return {
      ratings: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      summary: {
        averageRating: parseFloat(averageRating),
        totalRatings,
        ratingDistribution
      }
    };
  }

  /**
   * Get user's rating for a vendor
   * @param {number} userId - User ID
   * @param {number} vendorId - Vendor ID
   */
  async getUserRatingForVendor(userId, vendorId) {
    const rating = await VendorRating.findOne({
      where: { userId, vendorId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'logoImage']
        },
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    return rating;
  }

  /**
   * Update user's rating for a vendor
   * @param {number} userId - User ID
   * @param {number} vendorId - Vendor ID
   * @param {number} rating - New rating value (1-5)
   * @param {string} comment - Optional comment
   */
  async updateRating(userId, vendorId, rating, comment = null) {
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const vendorRating = await VendorRating.findOne({
      where: { userId, vendorId }
    });

    if (!vendorRating) {
      throw new Error('Rating not found');
    }

    vendorRating.rating = rating;
    if (comment !== null) vendorRating.comment = comment;
    await vendorRating.save();

    return vendorRating;
  }

  /**
   * Delete user's rating for a vendor
   * @param {number} userId - User ID
   * @param {number} vendorId - Vendor ID
   */
  async deleteRating(userId, vendorId) {
    const vendorRating = await VendorRating.findOne({
      where: { userId, vendorId }
    });

    if (!vendorRating) {
      throw new Error('Rating not found');
    }

    await vendorRating.destroy();
    return { message: 'Rating deleted successfully' };
  }

  /**
   * Get vendor rating summary (for vendor dashboard)
   * @param {number} vendorId - Vendor ID
   */
  async getVendorRatingSummary(vendorId) {
    const ratings = await VendorRating.findAll({
      where: { vendorId },
      attributes: ['rating', 'comment']
    });

    const totalRatings = ratings.length;
    if (totalRatings === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        totalComments: 0
      };
    }

    const sumRatings = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = (sumRatings / totalRatings).toFixed(2);

    const ratingDistribution = {
      5: ratings.filter(r => r.rating === 5).length,
      4: ratings.filter(r => r.rating === 4).length,
      3: ratings.filter(r => r.rating === 3).length,
      2: ratings.filter(r => r.rating === 2).length,
      1: ratings.filter(r => r.rating === 1).length
    };

    const totalComments = ratings.filter(r => r.comment && r.comment.trim() !== '').length;

    return {
      averageRating: parseFloat(averageRating),
      totalRatings,
      ratingDistribution,
      totalComments
    };
  }
}

export default new RatingService();



