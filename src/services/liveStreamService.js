import { Op } from 'sequelize';
import LiveStream from '../models/LiveStream.js';
import LiveStreamViewer from '../models/LiveStreamViewer.js';
import LiveStreamLike from '../models/LiveStreamLike.js';
import User from '../models/User.js';
import agoraService from './agoraService.js';
import notificationService from './notificationService.js';
import Follow from '../models/Follow.js';
import { withQueryTimeout } from '../utils/timeoutHelper.js';
import { config } from '../config/app.js';

// Helper function to construct full image URL
const getImageUrl = (filename) => {
  if (!filename) return null;
  // If already a full URL, return as is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  // If starts with /files/, it's already a path, just add base URL
  if (filename.startsWith('/files/')) {
    const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;
    return `${baseUrl}${filename}`;
  }
  // Otherwise, it's just a filename, add base URL and /files/ prefix
  const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;
  return `${baseUrl}/files/${filename}`;
};

class LiveStreamService {
  /**
   * Create a new live stream
   * @param {number} vendorId - Vendor ID
   * @param {object} data - Live stream data (title, description, scheduledAt)
   * @returns {Promise<object>} Created live stream
   */
  async createLiveStream(vendorId, data) {
    const { title, description, scheduledAt, image } = data;

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
      viewerCount: 0,
      image: image || null
    }), 15000);

    // If starting immediately, set started_at
    if (!scheduledAt) {
      liveStream.startedAt = new Date();
      liveStream.status = 'live';
      await liveStream.save();

      // Automatically join vendor as viewer (publisher is also counted as viewer)
      try {
        await LiveStreamViewer.create({
          liveStreamId: liveStream.id,
          userId: vendorId,
          joinedAt: new Date()
        });
        // Update viewer count to include vendor
        await this.updateViewerCount(liveStream.id);
      } catch (error) {
        console.error('Failed to join vendor as viewer:', error.message);
        // Continue even if join fails - vendor can still stream as publisher
      }

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

    // Automatically join vendor as viewer (publisher is also counted as viewer)
    try {
      // Check if vendor already joined
      const existingViewer = await LiveStreamViewer.findOne({
        where: {
          liveStreamId,
          userId: vendorId,
          leftAt: null
        }
      });

      if (!existingViewer) {
        await LiveStreamViewer.create({
          liveStreamId,
          userId: vendorId,
          joinedAt: new Date()
        });
        // Update viewer count to include vendor
        await this.updateViewerCount(liveStreamId);
      }
    } catch (error) {
      console.error('Failed to join vendor as viewer:', error.message);
      // Continue even if join fails - vendor can still stream as publisher
    }

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
    
    // Convert image to full URL
    if (liveStreamData.image) {
      liveStreamData.image = getImageUrl(liveStreamData.image);
    }

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
        
        // Convert image to full URL
        if (data.image) {
          data.image = getImageUrl(data.image);
        }
        
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

    return liveStreams.map(ls => {
      const data = ls.toJSON ? ls.toJSON() : ls;
      // Convert image to full URL
      if (data.image) {
        data.image = getImageUrl(data.image);
      }
      return data;
    });
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

    // Ensure userId is valid
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (isNaN(numericUserId) || numericUserId <= 0) {
      throw new Error('Invalid user ID');
    }

    // Generate token
    // IMPORTANT: Use UID = 0 (like Agora UI) to avoid token validation issues
    // UID = 0 allows any UID to join, which matches Agora UI behavior
    let token;
    let uidToUse = 0; // Use 0 by default (like Agora UI) - allows any UID to join
    let useStringUid = false;
    let tokenGenerationAttempts = [];
    
    try {
      // Use UID = 0 first (like Agora UI does) - this is the most compatible approach
      token = agoraService.generateToken(
        liveStream.channelName,
        0, // UID = 0 allows any UID to join (like Agora UI)
        role,
        86400, // 24 hours
        false // use numeric UID
      );
      tokenGenerationAttempts.push({ method: 'uidZero', uid: 0, success: true });
      console.log('✅ Token generated with UID = 0 (allows any UID to join, like Agora UI)');
    } catch (error) {
      tokenGenerationAttempts.push({ method: 'uidZero', uid: 0, success: false, error: error.message });
      console.warn('⚠️ UID = 0 token generation failed, trying numeric UID:', error.message);
      
      try {
        // Fallback to actual numeric UID
        token = agoraService.generateToken(
          liveStream.channelName,
          numericUserId,
          role,
          86400, // 24 hours
          false // use numeric UID
        );
        uidToUse = numericUserId;
        tokenGenerationAttempts.push({ method: 'numericUid', uid: numericUserId, success: true });
        console.log('✅ Token generated with numeric UID:', numericUserId);
      } catch (error2) {
        tokenGenerationAttempts.push({ method: 'numericUid', uid: numericUserId, success: false, error: error2.message });
        console.warn('⚠️ Numeric UID token generation failed, trying string UID:', error2.message);
        
        // Last resort: try with string UID
        useStringUid = true;
        uidToUse = String(numericUserId);
        token = agoraService.generateToken(
          liveStream.channelName,
          uidToUse,
          role,
          86400, // 24 hours
          true // use string UID
        );
        tokenGenerationAttempts.push({ method: 'stringUid', uid: uidToUse, success: true });
        console.log('✅ Token generated with string UID:', uidToUse);
      }
    }

    // Validate token after generation
    const tokenValidation = agoraService.validateTokenComprehensive(token, {
      channelName: liveStream.channelName,
      uid: uidToUse,
      role
    });

    // Log token generation for debugging
    console.log('🔑 Agora Token Generated Successfully:', {
      liveStreamId,
      userId: numericUserId,
      uidUsed: uidToUse,
      uidType: useStringUid ? 'string' : 'number',
      role,
      channelName: liveStream.channelName,
      appId: agoraService.getAppId(),
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? token.substring(0, 50) + '...' : 'null',
      attempts: tokenGenerationAttempts,
      validation: {
        isValid: tokenValidation.isValid,
        errors: tokenValidation.errors,
        warnings: tokenValidation.warnings
      },
      note: uidToUse === 0 ? 'Token allows any UID to join (like Agora UI)' : 'Token requires specific UID'
    });

    // If token validation failed, log warning but still return token (let Agora SDK validate it)
    if (!tokenValidation.isValid) {
      console.warn('⚠️ Token validation failed, but returning token anyway. Agora SDK will validate it on join:', {
        errors: tokenValidation.errors,
        warnings: tokenValidation.warnings
      });
    }

    return {
      token,
      channelName: liveStream.channelName,
      uid: useStringUid ? uidToUse : numericUserId, // Return the actual UID used
      uidType: useStringUid ? 'string' : 'number', // Indicate UID type
      role,
      appId: agoraService.getAppId(), // Add App ID to response
      validation: {
        isValid: tokenValidation.isValid,
        errors: tokenValidation.errors,
        warnings: tokenValidation.warnings
      }
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
   * Get viewer count for a live stream
   * @param {number} liveStreamId - Live stream ID
   * @returns {Promise<number>} Current viewer count
   */
  async getViewerCount(liveStreamId) {
    const liveStream = await LiveStream.findByPk(liveStreamId);
    if (!liveStream) {
      throw new Error('Live stream not found');
    }

    // Get actual active viewers count (real-time)
    const activeViewers = await LiveStreamViewer.count({
      where: {
        liveStreamId,
        leftAt: null
      }
    });

    // Update stored count for consistency
    if (liveStream.viewerCount !== activeViewers) {
      await LiveStream.update(
        { viewerCount: activeViewers },
        { where: { id: liveStreamId } }
      );
    }

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
            id: liveStreamId.toString(), // Use 'id' as the main identifier
            liveStreamId: liveStreamId.toString(), // Also keep for backward compatibility
            vendorId: vendorId.toString(),
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

