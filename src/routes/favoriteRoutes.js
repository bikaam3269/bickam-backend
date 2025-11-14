import express from 'express';
import {
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  checkIsFavorite
} from '../controllers/favoriteController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All favorite routes require authentication
router.use(authenticate);

router.get('/', getFavorites);
router.post('/', addToFavorites);
router.delete('/:productId', removeFromFavorites);
router.get('/:productId/check', checkIsFavorite);

export default router;

