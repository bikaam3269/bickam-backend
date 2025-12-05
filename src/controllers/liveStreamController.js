import liveStreamService from '../services/liveStreamService.js';
import liveStreamMessageService from '../services/liveStreamMessageService.js';
import liveStreamLikeService from '../services/liveStreamLikeService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

// Live Stream Management
export const createLiveStream = async (req, res, next) => {
  try {
    // Authorization is handled by authorize middleware in routes
    const liveStream = await liveStreamService.createLiveStream(req.user.id, req.body);
    return sendSuccess(res, liveStream, 'Live stream created successfully', 201);
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('not found') || error.message.includes('not a vendor')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const startLiveStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const liveStreamId = parseInt(id);
    
    if (isNaN(liveStreamId) || liveStreamId <= 0) {
      return sendError(res, 'Invalid live stream ID', 400);
    }
    
    // Authorization is handled by authorize middleware in routes
    const liveStream = await liveStreamService.startLiveStream(liveStreamId, req.user.id);
    return sendSuccess(res, liveStream, 'Live stream started successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('Unauthorized') || error.message.includes('already') || error.message.includes('ended')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const endLiveStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const liveStreamId = parseInt(id);
    
    if (isNaN(liveStreamId) || liveStreamId <= 0) {
      return sendError(res, 'Invalid live stream ID', 400);
    }
    
    // Authorization is handled by authorize middleware in routes
    const liveStream = await liveStreamService.endLiveStream(liveStreamId, req.user.id);
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
    const liveStreamId = parseInt(id);
    
    if (isNaN(liveStreamId) || liveStreamId <= 0) {
      return sendError(res, 'Invalid live stream ID', 400);
    }
    
    const userId = req.user ? req.user.id : null;
    const liveStream = await liveStreamService.getLiveStreamById(liveStreamId, userId);
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
    const vendorIdNum = parseInt(vendorId);
    
    if (isNaN(vendorIdNum) || vendorIdNum <= 0) {
      return sendError(res, 'Invalid vendor ID', 400);
    }
    
    const liveStreams = await liveStreamService.getVendorLiveStreams(vendorIdNum);
    return sendSuccess(res, liveStreams, 'Vendor live streams retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Join/Leave Live Stream
export const joinLiveStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const liveStreamId = parseInt(id);
    
    if (isNaN(liveStreamId) || liveStreamId <= 0) {
      return sendError(res, 'Invalid live stream ID', 400);
    }
    
    // Authentication is handled by authenticate middleware in routes
    await liveStreamService.joinLiveStream(liveStreamId, req.user.id);
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
    const liveStreamId = parseInt(id);
    
    if (isNaN(liveStreamId) || liveStreamId <= 0) {
      return sendError(res, 'Invalid live stream ID', 400);
    }
    
    // Authentication is handled by authenticate middleware in routes
    await liveStreamService.leaveLiveStream(liveStreamId, req.user.id);
    return sendSuccess(res, null, 'Left live stream successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getLiveStreamToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role = 'subscriber' } = req.query;
    
    const liveStreamId = parseInt(id);
    
    if (isNaN(liveStreamId) || liveStreamId <= 0) {
      return sendError(res, 'Invalid live stream ID', 400);
    }

    // Validate role
    if (role !== 'publisher' && role !== 'subscriber') {
      return sendError(res, 'Role must be either "publisher" or "subscriber"', 400);
    }

    // Authentication is handled by authenticate middleware in routes
    const tokenData = await liveStreamService.getLiveStreamToken(
      liveStreamId,
      req.user.id,
      role
    );
    return sendSuccess(res, tokenData, 'Token generated successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('not live') || error.message.includes('publisher') || error.message.includes('Unauthorized')) {
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
    
    const liveStreamId = parseInt(id);
    
    if (isNaN(liveStreamId) || liveStreamId <= 0) {
      return sendError(res, 'Invalid live stream ID', 400);
    }

    // Authentication is handled by authenticate middleware in routes
    if (!message || message.trim().length === 0) {
      return sendError(res, 'Message cannot be empty', 400);
    }

    const messageRecord = await liveStreamMessageService.sendMessage(
      liveStreamId,
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
    const liveStreamId = parseInt(id);
    
    if (isNaN(liveStreamId) || liveStreamId <= 0) {
      return sendError(res, 'Invalid live stream ID', 400);
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = await liveStreamMessageService.getMessages(
      liveStreamId,
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
    const { messageId } = req.params;
    const messageIdNum = parseInt(messageId);
    
    if (isNaN(messageIdNum) || messageIdNum <= 0) {
      return sendError(res, 'Invalid message ID', 400);
    }
    
    // Authentication is handled by authenticate middleware in routes
    await liveStreamMessageService.deleteMessage(messageIdNum, req.user.id);
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
    const liveStreamId = parseInt(id);
    
    if (isNaN(liveStreamId) || liveStreamId <= 0) {
      return sendError(res, 'Invalid live stream ID', 400);
    }
    
    // Authentication is handled by authenticate middleware in routes
    const result = await liveStreamLikeService.toggleLike(liveStreamId, req.user.id);
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
    const liveStreamId = parseInt(id);
    
    if (isNaN(liveStreamId) || liveStreamId <= 0) {
      return sendError(res, 'Invalid live stream ID', 400);
    }
    
    const count = await liveStreamLikeService.getLikesCount(liveStreamId);
    return sendSuccess(res, { likesCount: count }, 'Likes count retrieved successfully');
  } catch (error) {
    next(error);
  }
};

