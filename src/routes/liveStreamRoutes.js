import express from 'express';
import {
  createLiveStream,
  startLiveStream,
  endLiveStream,
  getLiveStream,
  getActiveLiveStreams,
  getVendorLiveStreams,
  joinLiveStream,
  leaveLiveStream,
  getLiveStreamToken,
  sendMessage,
  getMessages,
  deleteMessage,
  toggleLike,
  getLikesCount
} from '../controllers/liveStreamController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Live Stream Management
router.post('/', authenticate, authorize('vendor', 'admin'), createLiveStream);
router.get('/', optionalAuthenticate, getActiveLiveStreams);
router.get('/vendor/:vendorId', getVendorLiveStreams);
router.get('/:id', optionalAuthenticate, getLiveStream);
router.put('/:id/start', authenticate, authorize('vendor', 'admin'), startLiveStream);
router.put('/:id/end', authenticate, authorize('vendor', 'admin'), endLiveStream);

// Join/Leave Live Stream
router.post('/:id/join', authenticate, joinLiveStream);
router.post('/:id/leave', authenticate, leaveLiveStream);
router.get('/:id/token', authenticate, getLiveStreamToken);

// Messages
router.post('/:id/messages', authenticate, sendMessage);
router.get('/:id/messages', optionalAuthenticate, getMessages);
router.delete('/:id/messages/:messageId', authenticate, deleteMessage);

// Likes
router.post('/:id/like', authenticate, toggleLike);
router.get('/:id/likes', getLikesCount);

export default router;

