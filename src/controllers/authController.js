import authService from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

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
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: { message: error.errors[0].message }
      });
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
  } catch (error) {s
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


