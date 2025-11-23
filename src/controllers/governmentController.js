import governmentService from '../services/governmentService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getAllGovernments = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search
    };

    const governments = await governmentService.getAllGovernments(filters);

    return sendSuccess(res, governments, 'Governments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getGovernmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const government = await governmentService.getGovernmentById(id);

    return sendSuccess(res, government, 'Government retrieved successfully');
  } catch (error) {
    if (error.message === 'Government not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getGovernmentByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const government = await governmentService.getGovernmentByCode(code);

    return sendSuccess(res, government, 'Government retrieved successfully');
  } catch (error) {
    if (error.message === 'Government not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const createGovernment = async (req, res, next) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return sendError(res, 'Name and code are required', 400);
    }

    const government = await governmentService.createGovernment({
      name,
      code
    });

    return sendSuccess(res, government, 'Government created successfully', 201);
  } catch (error) {
    if (error.message === 'Government code already exists') {
      return sendError(res, error.message, 409);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const updateGovernment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const government = await governmentService.updateGovernment(id, req.body);

    return sendSuccess(res, government, 'Government updated successfully');
  } catch (error) {
    if (error.message === 'Government not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message === 'Government code already exists') {
      return sendError(res, error.message, 409);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const deleteGovernment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await governmentService.deleteGovernment(id);

    return sendSuccess(res, null, 'Government deleted successfully');
  } catch (error) {
    if (error.message === 'Government not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};


