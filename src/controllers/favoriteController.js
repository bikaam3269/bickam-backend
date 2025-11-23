import favoriteService from '../services/favoriteService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const favorites = await favoriteService.getFavorites(userId);

    return sendSuccess(res, favorites, 'Favorites retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const addToFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return sendError(res, 'Product ID is required', 400);
    }

    const favorite = await favoriteService.addToFavorites(userId, productId);

    return sendSuccess(res, favorite, 'Product added to favorites', 201);
  } catch (error) {
    if (error.message === 'Product not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Product already in favorites') {
      return sendError(res, error.message, 409);
    }
    next(error);
  }
};

export const removeFromFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const result = await favoriteService.removeFromFavorites(userId, parseInt(productId));

    return sendSuccess(res, result, 'Product removed from favorites');
  } catch (error) {
    if (error.message === 'Product not in favorites') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const checkIsFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const isFavorite = await favoriteService.isFavorite(userId, parseInt(productId));

    return sendSuccess(res, { isFavorite }, 'Favorite status retrieved successfully');
  } catch (error) {
    next(error);
  }
};

