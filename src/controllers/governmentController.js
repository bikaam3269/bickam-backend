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

export const getAllGovernmentsWithCities = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search
    };

    const governments = await governmentService.getAllGovernmentsWithCities(filters);

    return sendSuccess(res, governments, 'Governments with cities retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getGovernmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const governmentId = parseInt(id);
    
    if (isNaN(governmentId) || governmentId <= 0) {
      return sendError(res, 'Invalid government ID', 400);
    }
    
    const government = await governmentService.getGovernmentById(governmentId);

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
    const { name, order } = req.body;

    if (!name) {
      return sendError(res, 'Name is required', 400);
    }

    const government = await governmentService.createGovernment({
      name,
      order: order || 0
    });

    return sendSuccess(res, government, 'Government created successfully', 201);
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const updateGovernment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const governmentId = parseInt(id);
    
    if (isNaN(governmentId) || governmentId <= 0) {
      return sendError(res, 'Invalid government ID', 400);
    }
    
    const government = await governmentService.updateGovernment(governmentId, req.body);

    return sendSuccess(res, government, 'Government updated successfully');
  } catch (error) {
    if (error.message === 'Government not found') {
      return sendError(res, error.message, 404);
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
    const governmentId = parseInt(id);
    
    if (isNaN(governmentId) || governmentId <= 0) {
      return sendError(res, 'Invalid government ID', 400);
    }
    
    await governmentService.deleteGovernment(governmentId);

    return sendSuccess(res, null, 'Government deleted successfully');
  } catch (error) {
    if (error.message === 'Government not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};


