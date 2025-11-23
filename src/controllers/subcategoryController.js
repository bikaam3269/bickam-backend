import subcategoryService from '../services/subcategoryService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getAllSubcategories = async (req, res, next) => {
  try {
    const filters = {
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId) : undefined
    };

    const subcategories = await subcategoryService.getAllSubcategories(filters);

    return sendSuccess(res, subcategories, 'Subcategories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getSubcategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subcategory = await subcategoryService.getSubcategoryById(parseInt(id));

    return sendSuccess(res, subcategory, 'Subcategory retrieved successfully');
  } catch (error) {
    if (error.message === 'Subcategory not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const createSubcategory = async (req, res, next) => {
  try {
    const subcategoryData = { ...req.body };
    
    // Attach uploaded image filename if file was uploaded
    if (req.file) {
      subcategoryData.image = req.file.filename;
    }

    const subcategory = await subcategoryService.createSubcategory(subcategoryData);

    return sendSuccess(res, subcategory, 'Subcategory created successfully', 201);
  } catch (error) {
    if (error.message === 'Subcategory name is required' ||
        error.message === 'Category ID is required' ||
        error.message === 'Category not found' ||
        error.message === 'Subcategory with this name already exists in this category') {
      return sendError(res, error.message, 400);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const updateSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subcategoryData = { ...req.body };
    
    // Attach uploaded image filename if file was uploaded
    if (req.file) {
      subcategoryData.image = req.file.filename;
    }

    const subcategory = await subcategoryService.updateSubcategory(parseInt(id), subcategoryData);

    return sendSuccess(res, subcategory, 'Subcategory updated successfully');
  } catch (error) {
    if (error.message === 'Subcategory not found' ||
        error.message === 'Category not found' ||
        error.message === 'Subcategory with this name already exists in this category') {
      return sendError(res, error.message, 400);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const deleteSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await subcategoryService.deleteSubcategory(parseInt(id));

    return sendSuccess(res, result, result.message || 'Subcategory deleted successfully');
  } catch (error) {
    if (error.message === 'Subcategory not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getSubcategoriesByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const subcategories = await subcategoryService.getSubcategoriesByCategory(parseInt(categoryId));

    return sendSuccess(res, subcategories, 'Subcategories retrieved successfully');
  } catch (error) {
    if (error.message === 'Category not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

