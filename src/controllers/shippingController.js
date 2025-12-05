import shippingService from '../services/shippingService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getAllShippings = async (req, res, next) => {
  try {
    const filters = {
      fromCityId: req.query.fromCityId ? parseInt(req.query.fromCityId) : null,
      toCityId: req.query.toCityId ? parseInt(req.query.toCityId) : null,
      search: req.query.search
    };

    // Validate IDs if provided
    if (filters.fromCityId && (isNaN(filters.fromCityId) || filters.fromCityId <= 0)) {
      return sendError(res, 'Invalid from city ID', 400);
    }

    if (filters.toCityId && (isNaN(filters.toCityId) || filters.toCityId <= 0)) {
      return sendError(res, 'Invalid to city ID', 400);
    }

    const shippings = await shippingService.getAllShippings(filters);
    return sendSuccess(res, shippings, 'Shippings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getShippingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shippingId = parseInt(id);
    
    if (isNaN(shippingId) || shippingId <= 0) {
      return sendError(res, 'Invalid shipping ID', 400);
    }
    
    const shipping = await shippingService.getShippingById(shippingId);
    return sendSuccess(res, shipping, 'Shipping retrieved successfully');
  } catch (error) {
    if (error.message === 'Shipping not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getShippingPrice = async (req, res, next) => {
  try {
    const { fromCityId, toCityId } = req.query;
    
    const fromId = parseInt(fromCityId);
    const toId = parseInt(toCityId);
    
    if (isNaN(fromId) || fromId <= 0) {
      return sendError(res, 'Invalid from city ID', 400);
    }
    
    if (isNaN(toId) || toId <= 0) {
      return sendError(res, 'Invalid to city ID', 400);
    }
    
    const shipping = await shippingService.getShippingPrice(fromId, toId);
    return sendSuccess(res, shipping, 'Shipping price retrieved successfully');
  } catch (error) {
    if (error.message.includes('not found')) {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const createShipping = async (req, res, next) => {
  try {
    const { fromCityId, toCityId, price } = req.body;

    if (!fromCityId || !toCityId || price === undefined || price === null) {
      return sendError(res, 'From city, to city, and price are required', 400);
    }

    const fromId = parseInt(fromCityId);
    const toId = parseInt(toCityId);
    const shippingPrice = parseFloat(price);

    if (isNaN(fromId) || fromId <= 0) {
      return sendError(res, 'Invalid from city ID', 400);
    }

    if (isNaN(toId) || toId <= 0) {
      return sendError(res, 'Invalid to city ID', 400);
    }

    if (isNaN(shippingPrice) || shippingPrice < 0) {
      return sendError(res, 'Invalid price. Price must be a positive number', 400);
    }

    const shipping = await shippingService.createShipping({
      fromCityId: fromId,
      toCityId: toId,
      price: shippingPrice
    });

    return sendSuccess(res, shipping, 'Shipping created successfully', 201);
  } catch (error) {
    if (error.message.includes('not found')) {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('already exists') || error.message.includes('cannot be the same')) {
      return sendError(res, error.message, 409);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const updateShipping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shippingId = parseInt(id);
    
    if (isNaN(shippingId) || shippingId <= 0) {
      return sendError(res, 'Invalid shipping ID', 400);
    }

    // Validate IDs if provided
    if (req.body.fromCityId) {
      const fromId = parseInt(req.body.fromCityId);
      if (isNaN(fromId) || fromId <= 0) {
        return sendError(res, 'Invalid from city ID', 400);
      }
    }

    if (req.body.toCityId) {
      const toId = parseInt(req.body.toCityId);
      if (isNaN(toId) || toId <= 0) {
        return sendError(res, 'Invalid to city ID', 400);
      }
    }

    if (req.body.price !== undefined) {
      const shippingPrice = parseFloat(req.body.price);
      if (isNaN(shippingPrice) || shippingPrice < 0) {
        return sendError(res, 'Invalid price. Price must be a positive number', 400);
      }
    }
    
    const shipping = await shippingService.updateShipping(shippingId, req.body);
    return sendSuccess(res, shipping, 'Shipping updated successfully');
  } catch (error) {
    if (error.message.includes('not found')) {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('already exists') || error.message.includes('cannot be the same')) {
      return sendError(res, error.message, 409);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const deleteShipping = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shippingId = parseInt(id);
    
    if (isNaN(shippingId) || shippingId <= 0) {
      return sendError(res, 'Invalid shipping ID', 400);
    }
    
    await shippingService.deleteShipping(shippingId);
    return sendSuccess(res, null, 'Shipping deleted successfully');
  } catch (error) {
    if (error.message === 'Shipping not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

