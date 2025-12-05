import cityService from '../services/cityService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getAllCities = async (req, res, next) => {
  try {
    const filters = {
      governmentId: req.query.governmentId ? parseInt(req.query.governmentId) : null,
      search: req.query.search
    };

    // Validate governmentId if provided
    if (filters.governmentId && (isNaN(filters.governmentId) || filters.governmentId <= 0)) {
      return sendError(res, 'Invalid government ID', 400);
    }

    const cities = await cityService.getAllCities(filters);
    return sendSuccess(res, cities, 'Cities retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getCityById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cityId = parseInt(id);
    
    if (isNaN(cityId) || cityId <= 0) {
      return sendError(res, 'Invalid city ID', 400);
    }
    
    const city = await cityService.getCityById(cityId);
    return sendSuccess(res, city, 'City retrieved successfully');
  } catch (error) {
    if (error.message === 'City not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getCitiesByGovernmentId = async (req, res, next) => {
  try {
    const { governmentId } = req.params;
    const govId = parseInt(governmentId);
    
    if (isNaN(govId) || govId <= 0) {
      return sendError(res, 'Invalid government ID', 400);
    }
    
    const cities = await cityService.getCitiesByGovernmentId(govId);
    return sendSuccess(res, cities, 'Cities retrieved successfully');
  } catch (error) {
    if (error.message === 'Government not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const createCity = async (req, res, next) => {
  try {
    const { name, governmentId } = req.body;

    if (!name || !governmentId) {
      return sendError(res, 'Name and government ID are required', 400);
    }

    const govId = parseInt(governmentId);
    if (isNaN(govId) || govId <= 0) {
      return sendError(res, 'Invalid government ID', 400);
    }

    const city = await cityService.createCity({
      name,
      governmentId: govId
    });

    return sendSuccess(res, city, 'City created successfully', 201);
  } catch (error) {
    if (error.message === 'Government not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('already exists')) {
      return sendError(res, error.message, 409);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const updateCity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cityId = parseInt(id);
    
    if (isNaN(cityId) || cityId <= 0) {
      return sendError(res, 'Invalid city ID', 400);
    }

    // Validate governmentId if provided
    if (req.body.governmentId) {
      const govId = parseInt(req.body.governmentId);
      if (isNaN(govId) || govId <= 0) {
        return sendError(res, 'Invalid government ID', 400);
      }
    }
    
    const city = await cityService.updateCity(cityId, req.body);
    return sendSuccess(res, city, 'City updated successfully');
  } catch (error) {
    if (error.message === 'City not found' || error.message === 'Government not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('already exists')) {
      return sendError(res, error.message, 409);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const deleteCity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cityId = parseInt(id);
    
    if (isNaN(cityId) || cityId <= 0) {
      return sendError(res, 'Invalid city ID', 400);
    }
    
    await cityService.deleteCity(cityId);
    return sendSuccess(res, null, 'City deleted successfully');
  } catch (error) {
    if (error.message === 'City not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

