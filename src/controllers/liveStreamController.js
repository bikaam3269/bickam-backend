import liveStreamService from '../services/liveStreamService.js';
import liveStreamMessageService from '../services/liveStreamMessageService.js';
import liveStreamLikeService from '../services/liveStreamLikeService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

// Live Stream Management
export const createLiveStream = async (req, res, next) => {
  try {
    // Only vendors can create live streams
    if (req.user.type !== 'vendor' && req.user.type !== 'admin') {
      return sendError(res, 'Only vendors can create live streams', 403);
    }

    const liveStream = await liveStreamService.createLiveStream(req.user.id, req.body);
    return sendSuccess(res, liveStream, 'Live stream created successfully', 201);
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('not found')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const startLiveStream = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Only vendors can start live streams
    if (req.user.type !== 'vendor' && req.user.type !== 'admin') {
      return sendError(res, 'Only vendors can start live streams', 403);
    }

    const liveStream = await liveStreamService.startLiveStream(parseInt(id), req.user.id);
    return sendSuccess(res, liveStream, 'Live stream started successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('Unauthorized') || error.message.includes('already')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const endLiveStream = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Only vendors can end live streams
    if (req.user.type !== 'vendor' && req.user.type !== 'admin') {
      return sendError(res, 'Only vendors can end live streams', 403);
    }

    const liveStream = await liveStreamService.endLiveStream(parseInt(id), req.user.id);
    return sendSuccess(res, liveStream, 'Live stream ended successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('Unauthorized') || error.message.includes('already')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getLiveStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const liveStream = await liveStreamService.getLiveStreamById(parseInt(id), userId);
    return sendSuccess(res, liveStream, 'Live stream retrieved successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getActiveLiveStreams = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const liveStreams = await liveStreamService.getActiveLiveStreams(userId);
    return sendSuccess(res, liveStreams, 'Active live streams retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getVendorLiveStreams = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const liveStreams = await liveStreamService.getVendorLiveStreams(parseInt(vendorId));
    return sendSuccess(res, liveStreams, 'Vendor live streams retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Join/Leave Live Stream
export const joinLiveStream = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    await liveStreamService.joinLiveStream(parseInt(id), req.user.id);
    return sendSuccess(res, null, 'Joined live stream successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('not live')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const leaveLiveStream = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    await liveStreamService.leaveLiveStream(parseInt(id), req.user.id);
    return sendSuccess(res, null, 'Left live stream successfully');
  } catch (error) {
    next(error);
  }
};

export const getLiveStreamToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role = 'subscriber' } = req.query;

    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    const tokenData = await liveStreamService.getLiveStreamToken(
      parseInt(id),
      req.user.id,
      role
    );
    return sendSuccess(res, tokenData, 'Token generated successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('not live') || error.message.includes('publisher')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

// Messages
export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    if (!message || message.trim().length === 0) {
      return sendError(res, 'Message cannot be empty', 400);
    }

    const messageRecord = await liveStreamMessageService.sendMessage(
      parseInt(id),
      req.user.id,
      message
    );
    return sendSuccess(res, messageRecord, 'Message sent successfully', 201);
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('empty') || error.message.includes('long') || error.message.includes('not live')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = await liveStreamMessageService.getMessages(
      parseInt(id),
      limit,
      offset
    );
    return sendSuccess(res, messages, 'Messages retrieved successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { id, messageId } = req.params;

    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    await liveStreamMessageService.deleteMessage(parseInt(messageId), req.user.id);
    return sendSuccess(res, null, 'Message deleted successfully');
  } catch (error) {
    if (error.message === 'Message not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('Unauthorized')) {
      return sendError(res, error.message, 403);
    }
    next(error);
  }
};

// Likes
export const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    const result = await liveStreamLikeService.toggleLike(parseInt(id), req.user.id);
    return sendSuccess(res, result, 'Like toggled successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getLikesCount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const count = await liveStreamLikeService.getLikesCount(parseInt(id));
    return sendSuccess(res, { likesCount: count }, 'Likes count retrieved successfully');
  } catch (error) {
    next(error);
  }
};

