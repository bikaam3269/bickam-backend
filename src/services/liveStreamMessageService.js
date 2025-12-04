import { Op } from 'sequelize';
import LiveStreamMessage from '../models/LiveStreamMessage.js';
import LiveStream from '../models/LiveStream.js';
import User from '../models/User.js';

class LiveStreamMessageService {
  /**
   * Send a message in live stream
   * @param {number} liveStreamId - Live stream ID
   * @param {number} userId - User ID
   * @param {string} message - Message content
   * @returns {Promise<object>} Created message
   */
  async sendMessage(liveStreamId, userId, message) {
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > 500) {
      throw new Error('Message is too long (max 500 characters)');
    }

    // Check if live stream exists and is live
    const liveStream = await LiveStream.findByPk(liveStreamId);
    if (!liveStream) {
      throw new Error('Live stream not found');
    }

    if (liveStream.status !== 'live') {
      throw new Error('Cannot send messages to a non-live stream');
    }

    // Create message
    const messageRecord = await LiveStreamMessage.create({
      liveStreamId,
      userId,
      message: message.trim()
    });

    // Get message with user details
    return await this.getMessageById(messageRecord.id);
  }

  /**
   * Get messages for a live stream
   * @param {number} liveStreamId - Live stream ID
   * @param {number} limit - Number of messages to retrieve (default: 50)
   * @param {number} offset - Offset for pagination (default: 0)
   * @returns {Promise<Array>} Array of messages
   */
  async getMessages(liveStreamId, limit = 50, offset = 0) {
    // Check if live stream exists
    const liveStream = await LiveStream.findByPk(liveStreamId);
    if (!liveStream) {
      throw new Error('Live stream not found');
    }

    const messages = await LiveStreamMessage.findAll({
      where: { liveStreamId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'type']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Math.min(limit, 100), // Max 100 messages
      offset
    });

    return messages.map(msg => {
      const data = msg.toJSON ? msg.toJSON() : msg;
      return data;
    });
  }

  /**
   * Get message by ID
   * @param {number} messageId - Message ID
   * @returns {Promise<object>} Message with user details
   */
  async getMessageById(messageId) {
    const message = await LiveStreamMessage.findByPk(messageId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'type']
        },
        {
          model: LiveStream,
          as: 'liveStream',
          attributes: ['id', 'vendorId']
        }
      ]
    });

    if (!message) {
      throw new Error('Message not found');
    }

    return message.toJSON ? message.toJSON() : message;
  }

  /**
   * Delete a message
   * @param {number} messageId - Message ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async deleteMessage(messageId, userId) {
    const message = await LiveStreamMessage.findByPk(messageId, {
      include: [
        {
          model: LiveStream,
          as: 'liveStream',
          attributes: ['id', 'vendorId']
        }
      ]
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check authorization: user can delete their own message or vendor can delete any message
    const isOwner = message.userId === userId;
    const isVendor = message.liveStream && message.liveStream.vendorId === userId;

    if (!isOwner && !isVendor) {
      throw new Error('Unauthorized to delete this message');
    }

    await message.destroy();
    return true;
  }

  /**
   * Get message count for a live stream
   * @param {number} liveStreamId - Live stream ID
   * @returns {Promise<number>} Message count
   */
  async getMessageCount(liveStreamId) {
    return await LiveStreamMessage.count({
      where: { liveStreamId }
    });
  }
}

export default new LiveStreamMessageService();

