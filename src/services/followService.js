import Follow from '../models/Follow.js';
import User from '../models/User.js';
import Government from '../models/Government.js';
import Order from '../models/Order.js';
import notificationService from './notificationService.js';

class FollowService {
  async followVendor(followerId, vendorId) {
    // Check if trying to follow self
    if (followerId === vendorId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if vendor exists and is actually a vendor
    const vendor = await User.findByPk(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    if (vendor.type !== 'vendor') {
      throw new Error('Can only follow vendors');
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      where: {
        followerId,
        followingId: vendorId
      }
    });

    if (existingFollow) {
      throw new Error('Already following this vendor');
    }

    // Create follow relationship
    const follow = await Follow.create({
      followerId,
      followingId: vendorId
    });

    // Notify vendor about new follower
    try {
      const follower = await User.findByPk(followerId);
      if (follower) {
        await notificationService.notifyNewFollower(vendorId, followerId, follower.name);
      }
    } catch (error) {
      console.error('Failed to notify vendor about new follower:', error.message);
    }

    return follow;
  }

  async unfollowVendor(followerId, vendorId) {
    const follow = await Follow.findOne({
      where: {
        followerId,
        followingId: vendorId
      }
    });

    if (!follow) {
      throw new Error('Not following this vendor');
    }

    await follow.destroy();
    return { message: 'Unfollowed successfully' };
  }

  async getFollowers(vendorId) {
    // Verify vendor exists
    const vendor = await User.findByPk(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const followers = await Follow.findAll({
      where: { followingId: vendorId },
      include: [{
        model: User,
        as: 'follower',
        attributes: ['id', 'name', 'email', 'type', 'phone'],
        include: [{
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'code']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    return followers.map(follow => follow.follower);
  }

  async getFollowing(userId, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    // Get total count for pagination
    const totalCount = await Follow.count({
      where: { followerId: userId }
    });

    // Get following with pagination
    const following = await Follow.findAll({
      where: { followerId: userId },
      include: [{
        model: User,
        as: 'following',
        attributes: ['id', 'name', 'email', 'type', 'phone', 'activity', 'description', 'logoImage'],
        include: [{
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'code']
        }]
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get rating and followers count for each vendor
    const followingWithStats = await Promise.all(
      following.map(async (follow) => {
        const vendor = follow.following;
        if (!vendor || vendor.type !== 'vendor') {
          return null;
        }

        const vendorId = vendor.id;

        // Get followers count
        const followersCount = await Follow.count({
          where: { followingId: vendorId }
        });

        // Calculate rating from orders
        const totalOrders = await Order.count({
          where: { vendorId: vendorId }
        });

        const completedOrders = await Order.count({
          where: {
            vendorId: vendorId,
            status: 'delivered'
          }
        });

        // Calculate rating (0-5 scale based on completion rate)
        let rating = 0;
        if (totalOrders > 0) {
          const completionRate = completedOrders / totalOrders;
          rating = parseFloat((completionRate * 5).toFixed(2));
        }

        const vendorData = vendor.toJSON ? vendor.toJSON() : vendor;
        return {
          ...vendorData,
          rating,
          followersCount
        };
      })
    );

    // Filter out null values (in case of non-vendor users)
    const filteredFollowing = followingWithStats.filter(vendor => vendor !== null);

    return {
      following: filteredFollowing,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + filteredFollowing.length < totalCount
      }
    };
  }

  async getFollowCount(vendorId) {
    const followerCount = await Follow.count({
      where: { followingId: vendorId }
    });

    return followerCount;
  }

  async isFollowing(followerId, vendorId) {
    const follow = await Follow.findOne({
      where: {
        followerId,
        followingId: vendorId
      }
    });

    return !!follow;
  }

  async getVendorStats(vendorId) {
    const followerCount = await this.getFollowCount(vendorId);
    const isFollowingStatus = await this.isFollowing(vendorId, vendorId); // This will always be false, but useful for consistency

    return {
      followerCount,
      isFollowing: false
    };
  }
}

export default new FollowService();

