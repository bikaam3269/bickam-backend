import categoryService from '../services/categoryService.js';

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(parseInt(id));

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    if (error.message === 'Category not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    if (error.message === 'Category name is required' ||
        error.message === 'Category with this name already exists') {
      return res.status(400).json({
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

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await categoryService.updateCategory(parseInt(id), req.body);

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    if (error.message === 'Category not found' ||
        error.message === 'Category with this name already exists') {
      return res.status(400).json({
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

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await categoryService.deleteCategory(parseInt(id));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Category not found' ||
        error.message === 'Cannot delete category with existing subcategories') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

