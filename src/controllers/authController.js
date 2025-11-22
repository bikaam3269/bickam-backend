import authService from '../services/authService.js';

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

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.message && error.message.includes('Database query limit exceeded')) {
      return res.status(503).json({
        success: false,
        error: { 
          message: error.message,
          details: 'The database has reached its query limit. This is common on free database tiers. Please wait a few minutes and try again.'
        }
      });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: { message: error.errors[0].message }
      });
    }
    // Handle Sequelize connection errors
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeDatabaseError') {
      if (error.original && error.original.code === 'ER_USER_LIMIT_REACHED') {
        return res.status(503).json({
          success: false,
          error: { 
            message: 'Database query limit exceeded',
            details: 'The database has reached its query limit. Please wait a few minutes and try again, or upgrade your database plan.'
          }
        });
      }
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.message === 'Account not verified. Verification code has been sent to your phone.') {
      return res.status(403).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    // User is attached by authMiddleware
    const user = req.user;

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};


export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Current password is incorrect' || 
        error.message === 'User not found' ||
        error.message === 'Current password and new password are required' ||
        error.message === 'New password must be at least 6 characters long' ||
        error.message === 'New password must be different from current password') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const verifyCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const result = await authService.verifyCode(email, code);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Email and verification code are required' ||
        error.message === 'User not found' ||
        error.message === 'User is already verified' ||
        error.message === 'Invalid verification code' ||
        error.message === 'Verification code has expired. Please request a new one.') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const resendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await authService.resendVerificationCode(email);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Email is required' ||
        error.message === 'User not found' ||
        error.message === 'User is already verified' ||
        error.message === 'Phone number is required for verification') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Email is required' ||
        error.message === 'Phone number is required for password reset') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;

    const result = await authService.resetPassword(email, code, newPassword);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Email, verification code, and new password are required' ||
        error.message === 'Password must be at least 6 characters long' ||
        error.message === 'User not found' ||
        error.message === 'Invalid verification code' ||
        error.message === 'Verification code has expired. Please request a new one.') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};


