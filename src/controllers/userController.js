import userService from '../services/userService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getAllUsers = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      search: req.query.search,
      governmentId: req.query.governmentId
    };

    const users = await userService.getAllUsers(filters);

    return sendSuccess(res, users, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    return sendSuccess(res, user, 'User retrieved successfully');
  } catch (error) {
    if (error.message === 'User not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Update user profile
 * Supports multipart/form-data for file uploads (image)
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.updateUser(id, req.body, req.file, req.user);

    return sendSuccess(res, user, 'User updated successfully');
  } catch (error) {
    if (error.message === 'User not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Unauthorized to update this user') {
      return sendError(res, error.message, 403);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id, req.user);

    return sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    if (error.message === 'User not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Unauthorized to delete this user') {
      return sendError(res, error.message, 403);
    }
    next(error);
  }
};
