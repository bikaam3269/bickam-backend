import categoryService from '../services/categoryService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories();

    return sendSuccess(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(parseInt(id));

    return sendSuccess(res, category, 'Category retrieved successfully');
  } catch (error) {
    if (error.message === 'Category not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const categoryData = { ...req.body };
    
    // Attach uploaded image filename if file was uploaded
    if (req.file) {
      categoryData.image = req.file.filename;
    } else if (!categoryData.image) {
      categoryData.image = null;
    }

    const category = await categoryService.createCategory(categoryData);

    return sendSuccess(res, category, 'Category created successfully', 201);
  } catch (error) {
    if (error.message === 'Category name is required' ||
        error.message === 'Category with this name already exists') {
      return sendError(res, error.message, 400);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const categoryData = { ...req.body };
    
    // Attach uploaded image filename if file was uploaded
    if (req.file) {
      categoryData.image = req.file.filename;
    }

    const category = await categoryService.updateCategory(parseInt(id), categoryData);

    return sendSuccess(res, category, 'Category updated successfully');
  } catch (error) {
    if (error.message === 'Category not found' ||
        error.message === 'Category with this name already exists') {
      return sendError(res, error.message, 400);
    }
    if (error.name === 'SequelizeValidationError') {
      return sendError(res, error.errors[0].message, 400);
    }
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await categoryService.deleteCategory(parseInt(id));

    return sendSuccess(res, result, result.message || 'Category deleted successfully');
  } catch (error) {
    if (error.message === 'Category not found' ||
        error.message === 'Cannot delete category with existing subcategories') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

