import favoriteService from '../services/favoriteService.js';

export const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const favorites = await favoriteService.getFavorites(userId);

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    next(error);
  }
};

export const addToFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Product ID is required' }
      });
    }

    const favorite = await favoriteService.addToFavorites(userId, productId);

    res.status(201).json({
      success: true,
      data: favorite
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.message === 'Product already in favorites') {
      return res.status(409).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const removeFromFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const result = await favoriteService.removeFromFavorites(userId, parseInt(productId));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Product not in favorites') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const checkIsFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const isFavorite = await favoriteService.isFavorite(userId, parseInt(productId));

    res.json({
      success: true,
      data: { isFavorite }
    });
  } catch (error) {
    next(error);
  }
};

