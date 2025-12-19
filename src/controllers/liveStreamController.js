import liveStreamService from '../services/liveStreamService.js';
import liveStreamMessageService from '../services/liveStreamMessageService.js';
import liveStreamLikeService from '../services/liveStreamLikeService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

// Helper function to validate and parse ID
const validateId = (id, paramName = 'ID') => {
  const parsedId = parseInt(id);
  if (isNaN(parsedId) || parsedId <= 0) {
    throw new Error(`Invalid ${paramName}`);
  }
  return parsedId;
};

// Helper function to validate pagination parameters
const validatePagination = (limit, offset) => {
  const parsedLimit = parseInt(limit) || 50;
  const parsedOffset = parseInt(offset) || 0;
  
  if (parsedLimit < 1 || parsedLimit > 100) {
    throw new Error('Limit must be between 1 and 100');
  }
  if (parsedOffset < 0) {
    throw new Error('Offset must be 0 or greater');
  }
  
  return { limit: parsedLimit, offset: parsedOffset };
};

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
    const liveStreamId = validateId(req.params.id, 'live stream ID');
    
    // Authorization is handled by authorize middleware in routes
    const liveStream = await liveStreamService.startLiveStream(liveStreamId, req.user.id);
    return sendSuccess(res, liveStream, 'Live stream started successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Invalid live stream ID' || 
        error.message.includes('Unauthorized') || 
        error.message.includes('already') || 
        error.message.includes('ended')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const endLiveStream = async (req, res, next) => {
  try {
    const liveStreamId = validateId(req.params.id, 'live stream ID');
    
    // Authorization is handled by authorize middleware in routes
    const liveStream = await liveStreamService.endLiveStream(liveStreamId, req.user.id);
    return sendSuccess(res, liveStream, 'Live stream ended successfully');
  } catch (error) {
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Invalid live stream ID' || 
        error.message.includes('Unauthorized') || 
        error.message.includes('already')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getLiveStream = async (req, res, next) => {
  try {
    const liveStreamId = validateId(req.params.id, 'live stream ID');
    
    const userId = req.user ? req.user.id : null;
    const liveStream = await liveStreamService.getLiveStreamById(liveStreamId, userId);
    return sendSuccess(res, liveStream, 'Live stream retrieved successfully');
  } catch (error) {
    if (error.message === 'Invalid live stream ID') {
      return sendError(res, error.message, 400);
    }
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
    const vendorId = validateId(req.params.vendorId, 'vendor ID');
    
    const liveStreams = await liveStreamService.getVendorLiveStreams(vendorId);
    return sendSuccess(res, liveStreams, 'Vendor live streams retrieved successfully');
  } catch (error) {
    if (error.message === 'Invalid vendor ID') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

// Join/Leave Live Stream
export const joinLiveStream = async (req, res, next) => {
  try {
    const liveStreamId = validateId(req.params.id, 'live stream ID');
    
    // Authentication is handled by authenticate middleware in routes
    await liveStreamService.joinLiveStream(liveStreamId, req.user.id);
    return sendSuccess(res, null, 'Joined live stream successfully');
  } catch (error) {
    if (error.message === 'Invalid live stream ID') {
      return sendError(res, error.message, 400);
    }
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
    const liveStreamId = validateId(req.params.id, 'live stream ID');
    
    // Authentication is handled by authenticate middleware in routes
    await liveStreamService.leaveLiveStream(liveStreamId, req.user.id);
    return sendSuccess(res, null, 'Left live stream successfully');
  } catch (error) {
    if (error.message === 'Invalid live stream ID') {
      return sendError(res, error.message, 400);
    }
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getLiveStreamToken = async (req, res, next) => {
  try {
    const liveStreamId = validateId(req.params.id, 'live stream ID');
    const { role = 'subscriber' } = req.query;

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
    if (error.message === 'Invalid live stream ID') {
      return sendError(res, error.message, 400);
    }
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('not live') || 
        error.message.includes('publisher') || 
        error.message.includes('Unauthorized') ||
        error.message.includes('Invalid user ID')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const validateToken = async (req, res, next) => {
  try {
    const { token, channelName, uid, role } = req.body;

    if (!token) {
      return sendError(res, 'Token is required', 400);
    }

    // Import agoraService here to avoid circular dependency
    const agoraService = (await import('../services/agoraService.js')).default;

    const validation = agoraService.validateTokenComprehensive(token, {
      channelName,
      uid,
      role
    });

    return sendSuccess(res, {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      details: validation.details
    }, validation.isValid ? 'Token is valid' : 'Token validation failed');
  } catch (error) {
    next(error);
  }
};

// Messages
export const sendMessage = async (req, res, next) => {
  try {
    const liveStreamId = validateId(req.params.id, 'live stream ID');
    const { message } = req.body;

    // Authentication is handled by authenticate middleware in routes
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return sendError(res, 'Message cannot be empty', 400);
    }

    // Additional validation for message length (service also validates, but good to check early)
    if (message.trim().length > 500) {
      return sendError(res, 'Message is too long (max 500 characters)', 400);
    }

    const messageRecord = await liveStreamMessageService.sendMessage(
      liveStreamId,
      req.user.id,
      message.trim()
    );
    return sendSuccess(res, messageRecord, 'Message sent successfully', 201);
  } catch (error) {
    if (error.message === 'Invalid live stream ID') {
      return sendError(res, error.message, 400);
    }
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('empty') || 
        error.message.includes('long') || 
        error.message.includes('not live')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const liveStreamId = validateId(req.params.id, 'live stream ID');
    const { limit, offset } = validatePagination(req.query.limit, req.query.offset);

    const messages = await liveStreamMessageService.getMessages(
      liveStreamId,
      limit,
      offset
    );
    return sendSuccess(res, messages, 'Messages retrieved successfully');
  } catch (error) {
    if (error.message === 'Invalid live stream ID' || 
        error.message.includes('Limit') || 
        error.message.includes('Offset')) {
      return sendError(res, error.message, 400);
    }
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const messageId = validateId(req.params.messageId, 'message ID');
    
    // Authentication is handled by authenticate middleware in routes
    await liveStreamMessageService.deleteMessage(messageId, req.user.id);
    return sendSuccess(res, null, 'Message deleted successfully');
  } catch (error) {
    if (error.message === 'Invalid message ID') {
      return sendError(res, error.message, 400);
    }
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
    const liveStreamId = validateId(req.params.id, 'live stream ID');
    
    // Authentication is handled by authenticate middleware in routes
    const result = await liveStreamLikeService.toggleLike(liveStreamId, req.user.id);
    return sendSuccess(res, result, 'Like toggled successfully');
  } catch (error) {
    if (error.message === 'Invalid live stream ID') {
      return sendError(res, error.message, 400);
    }
    if (error.message === 'Live stream not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getLikesCount = async (req, res, next) => {
  try {
    const liveStreamId = validateId(req.params.id, 'live stream ID');
    
    const count = await liveStreamLikeService.getLikesCount(liveStreamId);
    return sendSuccess(res, { likesCount: count }, 'Likes count retrieved successfully');
  } catch (error) {
    if (error.message === 'Invalid live stream ID') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

