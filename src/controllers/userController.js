import userService from '../services/userService.js';

export const getAllUsers = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      search: req.query.search,
      governmentId: req.query.governmentId
    };

    const users = await userService.getAllUsers(filters);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.updateUser(id, req.body, req.user);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.message === 'Unauthorized to update this user') {
      return res.status(403).json({
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

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id, req.user);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.message === 'Unauthorized to delete this user') {
      return res.status(403).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};
