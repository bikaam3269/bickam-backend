import LiveStreamLike from '../models/LiveStreamLike.js';
import LiveStream from '../models/LiveStream.js';

class LiveStreamLikeService {
  /**
   * Toggle like on a live stream
   * @param {number} liveStreamId - Live stream ID
   * @param {number} userId - User ID
   * @returns {Promise<object>} Like status and count
   */
  async toggleLike(liveStreamId, userId) {
    // Check if live stream exists
    const liveStream = await LiveStream.findByPk(liveStreamId);
    if (!liveStream) {
      throw new Error('Live stream not found');
    }

    // Check if user already liked
    const existingLike = await LiveStreamLike.findOne({
      where: {
        liveStreamId,
        userId
      }
    });

    if (existingLike) {
      // Unlike: remove the like
      await existingLike.destroy();
      const count = await this.getLikesCount(liveStreamId);
      return {
        liked: false,
        likesCount: count
      };
    } else {
      // Like: create new like
      await LiveStreamLike.create({
        liveStreamId,
        userId
      });
      const count = await this.getLikesCount(liveStreamId);
      return {
        liked: true,
        likesCount: count
      };
    }
  }

  /**
   * Get likes count for a live stream
   * @param {number} liveStreamId - Live stream ID
   * @returns {Promise<number>} Likes count
   */
  async getLikesCount(liveStreamId) {
    return await LiveStreamLike.count({
      where: { liveStreamId }
    });
  }

  /**
   * Check if user liked a live stream
   * @param {number} liveStreamId - Live stream ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if user liked
   */
  async checkUserLiked(liveStreamId, userId) {
    if (!userId) {
      return false;
    }

    const like = await LiveStreamLike.findOne({
      where: {
        liveStreamId,
        userId
      }
    });

    return !!like;
  }

  /**
   * Get all users who liked a live stream
   * @param {number} liveStreamId - Live stream ID
   * @param {number} limit - Limit results (default: 100)
   * @returns {Promise<Array>} Array of user IDs who liked
   */
  async getLikedUsers(liveStreamId, limit = 100) {
    const likes = await LiveStreamLike.findAll({
      where: { liveStreamId },
      attributes: ['userId'],
      limit,
      order: [['createdAt', 'DESC']]
    });

    return likes.map(like => like.userId);
  }
}

export default new LiveStreamLikeService();

