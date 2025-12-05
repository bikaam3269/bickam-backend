import authService from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const register = async (req, res, next) => {
  try {
    const userData = { ...req.body };
    
    // Handle file uploads for vendor
    if (req.files) {
      if (req.files.logoImage && req.files.logoImage[0]) {
        userData.logoImage = req.files.logoImage[0].filename;
      }
      if (req.files.backgroundImage && req.files.backgroundImage[0]) {
        userData.backgroundImage = req.files.backgroundImage[0].filename;
      }
    }

    const result = await authService.register(userData);

    return sendSuccess(res, result, 'Registration successful', 201);
  } catch (error) {
    if (error.message === 'Email already exists') {
      return sendError(res, error.message, 409);
    }
    if (error.message && error.message.includes('Database query limit exceeded')) {
      return sendError(res, error.message, 503);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    // Handle Sequelize connection errors
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeDatabaseError') {
      if (error.original && error.original.code === 'ER_USER_LIMIT_REACHED') {
        return sendError(res, 'Database query limit exceeded. Please wait a few minutes and try again, or upgrade your database plan.', 503);
      }
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { phone, password, fcmToken } = req.body;

    const result = await authService.login(phone, password, fcmToken);

    // If user is not verified, return 200 with isVerified: false
    if (result.isVerified === false) {
      return sendSuccess(res, result, result.message || 'Verification code sent');
    }

    return sendSuccess(res, result, 'Login successful');
  } catch (error) {
    if (error.message === 'Invalid phone number or password' || 
        error.message === 'Phone number and password are required') {
      return sendError(res, error.message, 401);
    }
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    // User is attached by authMiddleware
    const user = req.user;

    return sendSuccess(res, user, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};


export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    return sendSuccess(res, result, 'Password changed successfully');
  } catch (error) {
    if (error.message === 'Current password is incorrect' || 
        error.message === 'User not found' ||
        error.message === 'Current password and new password are required' ||
        error.message === 'New password must be at least 6 characters long' ||
        error.message === 'New password must be different from current password') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const verifyCode = async (req, res, next) => {
  try {
    const { phone, code, fcmToken } = req.body;

    const result = await authService.verifyCode(phone, code, fcmToken);

    return sendSuccess(res, result, 'Account verified successfully');
  } catch (error) {
    if (error.message === 'Phone number and verification code are required' ||
        error.message === 'User not found' ||
        error.message === 'User is already verified' ||
        error.message === 'Invalid verification code' ||
        error.message === 'Verification code has expired. Please request a new one.') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const resendVerificationCode = async (req, res, next) => {
  try {
    const { phone } = req.body;

    const result = await authService.resendVerificationCode(phone);

    return sendSuccess(res, result, result.message || 'Verification code sent successfully');
  } catch (error) {
    if (error.message === 'Phone number is required' ||
        error.message === 'User not found' ||
        error.message === 'User is already verified') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { phone } = req.body;

    const result = await authService.forgotPassword(phone);

    return sendSuccess(res, result, result.message || 'Password reset code sent successfully');
  } catch (error) {
    if (error.message === 'Phone number is required' ||
        error.message === 'Phone number is required for password reset') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { phone, code, newPassword } = req.body;

    const result = await authService.resetPassword(phone, code, newPassword);

    return sendSuccess(res, result, result.message || 'Password reset successfully');
  } catch (error) {
    if (error.message === 'Phone number, verification code, and new password are required' ||
        error.message === 'Password must be at least 6 characters long' ||
        error.message === 'User not found' ||
        error.message === 'Invalid verification code' ||
        error.message === 'Verification code has expired. Please request a new one.') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};


