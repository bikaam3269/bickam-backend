import userService from '../services/userService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getAllUsers = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      search: req.query.search,
      governmentId: req.query.governmentId,
      status: req.query.status,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await userService.getAllUsers(filters);

    return sendSuccess(res, result, 'Users retrieved successfully');
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

export const exportUsers = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      search: req.query.search,
      governmentId: req.query.governmentId,
      status: req.query.status
    };

    const users = await userService.getAllUsersForExport(filters);

    // Convert to CSV format
    const headers = ['ID', 'الاسم', 'البريد الإلكتروني', 'الهاتف', 'النوع', 'المحافظة', 'المدينة', 'المحفظة', 'الطلبات', 'المتابعين', 'الحالة', 'تاريخ الإنشاء'];
    const csvRows = [
      headers.join(','),
      ...users.map(user => [
        user.id,
        `"${user.name}"`,
        `"${user.email}"`,
        `"${user.phone}"`,
        `"${user.type}"`,
        `"${user.government}"`,
        `"${user.city}"`,
        user.wallet,
        user.orders,
        user.followers,
        `"${user.status}"`,
        `"${user.createdAt}"`
      ].join(','))
    ];

    const csv = csvRows.join('\n');
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="users-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(BOM + csv);
  } catch (error) {
    next(error);
  }
};
