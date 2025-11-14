import subcategoryService from '../services/subcategoryService.js';

export const getAllSubcategories = async (req, res, next) => {
  try {
    const filters = {
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId) : undefined
    };

    const subcategories = await subcategoryService.getAllSubcategories(filters);

    res.json({
      success: true,
      data: subcategories
    });
  } catch (error) {
    next(error);
  }
};

export const getSubcategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subcategory = await subcategoryService.getSubcategoryById(parseInt(id));

    res.json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    if (error.message === 'Subcategory not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const createSubcategory = async (req, res, next) => {
  try {
    const subcategory = await subcategoryService.createSubcategory(req.body);

    res.status(201).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    if (error.message === 'Subcategory name is required' ||
        error.message === 'Category ID is required' ||
        error.message === 'Category not found' ||
        error.message === 'Subcategory with this name already exists in this category') {
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

export const updateSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subcategory = await subcategoryService.updateSubcategory(parseInt(id), req.body);

    res.json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    if (error.message === 'Subcategory not found' ||
        error.message === 'Category not found' ||
        error.message === 'Subcategory with this name already exists in this category') {
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

export const deleteSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await subcategoryService.deleteSubcategory(parseInt(id));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Subcategory not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const getSubcategoriesByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const subcategories = await subcategoryService.getSubcategoriesByCategory(parseInt(categoryId));

    res.json({
      success: true,
      data: subcategories
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

