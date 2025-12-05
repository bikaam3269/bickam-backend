import { Op } from 'sequelize';
import LiveStream from '../models/LiveStream.js';
import LiveStreamViewer from '../models/LiveStreamViewer.js';
import LiveStreamLike from '../models/LiveStreamLike.js';
import User from '../models/User.js';
import agoraService from './agoraService.js';
import notificationService from './notificationService.js';
import Follow from '../models/Follow.js';
import { withQueryTimeout } from '../utils/timeoutHelper.js';

class LiveStreamService {
  /**
   * Create a new live stream
   * @param {number} vendorId - Vendor ID
   * @param {object} data - Live stream data (title, description, scheduledAt)
   * @returns {Promise<object>} Created live stream
   */
  async createLiveStream(vendorId, data) {
    const { title, description, scheduledAt } = data;

    if (!title) {
      throw new Error('Title is required');
    }

    // Check if vendor exists and is a vendor
    const vendor = await withQueryTimeout(() => User.findByPk(vendorId), 10000);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    if (vendor.type !== 'vendor') {
      throw new Error('User is not a vendor');
    }

    // Generate unique channel name
    const channelName = `channel_${vendorId}_${Date.now()}`;

    // Generate token for vendor (publisher)
    const agoraToken = agoraService.generatePublisherToken(channelName, vendorId);

    const liveStream = await withQueryTimeout(() => LiveStream.create({
      vendorId,
      title,
      description: description || null,
      channelName,
      agoraToken,
      status: scheduledAt ? 'scheduled' : 'live',
      scheduledAt: scheduledAt || null,
      viewerCount: 0
    }), 15000);

    // If starting immediately, set started_at
    if (!scheduledAt) {
      liveStream.startedAt = new Date();
      liveStream.status = 'live';
      await liveStream.save();

      // Notify followers about new live stream
      try {
        await this.notifyFollowersAboutLiveStream(vendorId, liveStream.id, title, vendor.name);
      } catch (error) {
        console.error('Failed to notify followers about live stream:', error.message);
      }
    }

    return await this.getLiveStreamById(liveStream.id);
  }

  /**
   * Start a live stream
   * @param {number} liveStreamId - Live stream ID
   * @param {number} vendorId - Vendor ID (for authorization)
   * @returns {Promise<object>} Updated live stream
   */
  async startLiveStream(liveStreamId, vendorId) {
    const liveStream = await withQueryTimeout(() => LiveStream.findByPk(liveStreamId), 10000);
    if (!liveStream) {
      throw new Error('Live stream not found');
    }

    if (liveStream.vendorId !== vendorId) {
      throw new Error('Unauthorized to start this live stream');
    }

    if (liveStream.status === 'live') {
      throw new Error('Live stream is already live');
    }

    if (liveStream.status === 'ended') {
      throw new Error('Cannot start an ended live stream');
    }

    // Generate new token
    const agoraToken = agoraService.generatePublisherToken(liveStream.channelName, vendorId);
    
    liveStream.status = 'live';
    liveStream.startedAt = new Date();
    liveStream.agoraToken = agoraToken;
    await liveStream.save();

    // Notify followers
    try {
      const vendor = await User.findByPk(vendorId);
      await this.notifyFollowersAboutLiveStream(vendorId, liveStream.id, liveStream.title, vendor.name);
    } catch (error) {
      console.error('Failed to notify followers about live stream:', error.message);
    }

    return await this.getLiveStreamById(liveStream.id);
  }

  /**
   * End a live stream
   * @param {number} liveStreamId - Live stream ID
   * @param {number} vendorId - Vendor ID (for authorization)
   * @returns {Promise<object>} Updated live stream
   */
  async endLiveStream(liveStreamId, vendorId) {
    const liveStream = await withQueryTimeout(() => LiveStream.findByPk(liveStreamId), 10000);
    if (!liveStream) {
      throw new Error('Live stream not found');
    }

    if (liveStream.vendorId !== vendorId) {
      throw new Error('Unauthorized to end this live stream');
    }

    if (liveStream.status === 'ended') {
      throw new Error('Live stream is already ended');
    }

    liveStream.status = 'ended';
    liveStream.endedAt = new Date();
    await liveStream.save();

    return await this.getLiveStreamById(liveStream.id);
  }

  /**
   * Get live stream by ID
   * @param {number} id - Live stream ID
   * @param {number} userId - Optional user ID for checking like status
   * @returns {Promise<object>} Live stream with details
   */
  async getLiveStreamById(id, userId = null) {
    const liveStream = await withQueryTimeout(() => LiveStream.findByPk(id, {
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email', 'type', 'logoImage']
        }
      ]
    }), 15000);

    if (!liveStream) {
      throw new Error('Live stream not found');
    }

    const liveStreamData = liveStream.toJSON ? liveStream.toJSON() : liveStream;

    // Get likes count
    const likesCount = await LiveStreamLike.count({
      where: { liveStreamId: id }
    });
    liveStreamData.likesCount = likesCount;

    // Check if user liked (if userId provided)
    if (userId) {
      const userLike = await LiveStreamLike.findOne({
        where: { liveStreamId: id, userId }
      });
      liveStreamData.userLiked = !!userLike;
    } else {
      liveStreamData.userLiked = false;
    }

    return liveStreamData;
  }

  /**
   * Get all active live streams
   * @param {number} userId - Optional user ID for checking like status
   * @returns {Promise<Array>} Array of active live streams
   */
  async getActiveLiveStreams(userId = null) {
    const liveStreams = await withQueryTimeout(() => LiveStream.findAll({
      where: {
        status: 'live'
      },
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email', 'type', 'logoImage']
        }
      ],
      order: [['startedAt', 'DESC']]
    }), 20000);
    
    const liveStreamsData = await Promise.all(
      liveStreams.map(async (liveStream) => {
        const data = liveStream.toJSON ? liveStream.toJSON() : liveStream;
        
        // Get likes count
        const likesCount = await LiveStreamLike.count({
          where: { liveStreamId: liveStream.id }
        });
        data.likesCount = likesCount;

        // Check if user liked
        if (userId) {
          const userLike = await LiveStreamLike.findOne({
            where: { liveStreamId: liveStream.id, userId }
          });
          data.userLiked = !!userLike;
        } else {
          data.userLiked = false;
        }

        return data;
      })
    );

    return liveStreamsData;
  }

  /**
   * Get live streams by vendor
   * @param {number} vendorId - Vendor ID
   * @returns {Promise<Array>} Array of vendor's live streams
   */
  async getVendorLiveStreams(vendorId) {
    const liveStreams = await LiveStream.findAll({
      where: { vendorId },
      include: [
        {
          model: User,
          as: 'vendor',
          attributes: ['id', 'name', 'email', 'type', 'logoImage']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return liveStreams.map(ls => ls.toJSON ? ls.toJSON() : ls);
  }

  /**
   * Join a live stream
   * @param {number} liveStreamId - Live stream ID
   * @param {number} userId - User ID
   * @returns {Promise<object>} Viewer record
   */
  async joinLiveStream(liveStreamId, userId) {
    const liveStream = await LiveStream.findByPk(liveStreamId);
    if (!liveStream) {
      throw new Error('Live stream not found');
    }

    if (liveStream.status !== 'live') {
      throw new Error('Live stream is not live');
    }

    // Check if already joined
    const existingViewer = await LiveStreamViewer.findOne({
      where: {
        liveStreamId,
        userId,
        leftAt: null
      }
    });

    if (existingViewer) {
      return existingViewer;
    }

    // Create viewer record
    const viewer = await LiveStreamViewer.create({
      liveStreamId,
      userId,
      joinedAt: new Date()
    });

    // Update viewer count
    await this.updateViewerCount(liveStreamId);

    return viewer;
  }

  /**
   * Leave a live stream
   * @param {number} liveStreamId - Live stream ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async leaveLiveStream(liveStreamId, userId) {
    const viewer = await LiveStreamViewer.findOne({
      where: {
        liveStreamId,
        userId,
        leftAt: null
      }
    });

    if (viewer) {
      viewer.leftAt = new Date();
      await viewer.save();

      // Update viewer count
      await this.updateViewerCount(liveStreamId);
    }

    return true;
  }

  /**
   * Get Agora token for joining live stream
   * @param {number} liveStreamId - Live stream ID
   * @param {number} userId - User ID
   * @param {string} role - 'publisher' or 'subscriber' (default: 'subscriber')
   * @returns {Promise<object>} Token information
   */
  async getLiveStreamToken(liveStreamId, userId, role = 'subscriber') {
    const liveStream = await LiveStream.findByPk(liveStreamId);
    if (!liveStream) {
      throw new Error('Live stream not found');
    }

    if (liveStream.status !== 'live' && role === 'subscriber') {
      throw new Error('Live stream is not live');
    }

    // Only vendor can be publisher
    if (role === 'publisher' && liveStream.vendorId !== userId) {
      throw new Error('Only the vendor can be a publisher');
    }

    const token = agoraService.generateToken(
      liveStream.channelName,
      userId,
      role
    );

    return {
      token,
      channelName: liveStream.channelName,
      uid: userId,
      role
    };
  }

  /**
   * Update viewer count for a live stream
   * @param {number} liveStreamId - Live stream ID
   * @returns {Promise<number>} Updated viewer count
   */
  async updateViewerCount(liveStreamId) {
    const activeViewers = await LiveStreamViewer.count({
      where: {
        liveStreamId,
        leftAt: null
      }
    });

    await LiveStream.update(
      { viewerCount: activeViewers },
      { where: { id: liveStreamId } }
    );

    return activeViewers;
  }

  /**
   * Notify followers about new live stream
   * @param {number} vendorId - Vendor ID
   * @param {number} liveStreamId - Live stream ID
   * @param {string} title - Live stream title
   * @param {string} vendorName - Vendor name
   */
  async notifyFollowersAboutLiveStream(vendorId, liveStreamId, title, vendorName) {
    try {
      // Find all users who follow this vendor
      // followingId = vendorId (the vendor being followed)
      // followerId = userId (the user who follows)
      const followers = await Follow.findAll({
        where: { followingId: vendorId },
        attributes: ['followerId']
      });

      const followerIds = followers.map(f => f.followerId);

      if (followerIds.length === 0) {
        return;
      }

      // Send notifications to all followers
      for (const followerId of followerIds) {
        await notificationService.sendNotificationToUser(
          followerId,
          'بث مباشر جديد',
          `${vendorName} بدأ بث مباشر: ${title}`,
          {
            type: 'live_stream_started',
            liveStreamId,
            vendorId,
            vendorName
          }
        );
      }
    } catch (error) {
      console.error('Error notifying followers about live stream:', error);
    }
  }
}

export default new LiveStreamService();

