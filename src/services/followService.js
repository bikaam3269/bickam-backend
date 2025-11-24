import Follow from '../models/Follow.js';
import User from '../models/User.js';
import Government from '../models/Government.js';
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

  async getFollowing(userId) {
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
      order: [['createdAt', 'DESC']]
    });

    return following.map(follow => follow.following);
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

