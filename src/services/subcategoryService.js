import { Op } from 'sequelize';
import Subcategory from '../models/Subcategory.js';
import Category from '../models/Category.js';

class SubcategoryService {
  async getAllSubcategories(filters = {}) {
    const { categoryId } = filters;
    const where = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const subcategories = await Subcategory.findAll({
      where,
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']]
    });

    return subcategories;
  }

  async getSubcategoryById(id) {
    const subcategory = await Subcategory.findByPk(id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name']
      }]
    });

    if (!subcategory) {
      throw new Error('Subcategory not found');
    }

    return subcategory;
  }

  async createSubcategory(data) {
    const { name, description, categoryId } = data;

    if (!name) {
      throw new Error('Subcategory name is required');
    }

    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    // Check if category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Check if subcategory with same name exists in this category
    const existingSubcategory = await Subcategory.findOne({
      where: { name, categoryId }
    });

    if (existingSubcategory) {
      throw new Error('Subcategory with this name already exists in this category');
    }

    const subcategory = await Subcategory.create({
      name,
      description: description || null,
      categoryId
    });

    return await this.getSubcategoryById(subcategory.id);
  }

  async updateSubcategory(id, data) {
    const subcategory = await Subcategory.findByPk(id);
    if (!subcategory) {
      throw new Error('Subcategory not found');
    }

    // If updating categoryId, verify it exists
    if (data.categoryId) {
      const category = await Category.findByPk(data.categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
    }

    // If updating name, check if it's already taken in the same category
    if (data.name && data.name !== subcategory.name) {
      const categoryIdToCheck = data.categoryId || subcategory.categoryId;
      const existingSubcategory = await Subcategory.findOne({
        where: {
          name: data.name,
          categoryId: categoryIdToCheck,
          id: { [Op.ne]: id }
        }
      });

      if (existingSubcategory) {
        throw new Error('Subcategory with this name already exists in this category');
      }
    }

    Object.assign(subcategory, data);
    await subcategory.save();

    return await this.getSubcategoryById(subcategory.id);
  }

  async deleteSubcategory(id) {
    const subcategory = await Subcategory.findByPk(id);
    if (!subcategory) {
      throw new Error('Subcategory not found');
    }

    await subcategory.destroy();
    return { message: 'Subcategory deleted successfully' };
  }

  async getSubcategoriesByCategory(categoryId) {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    return await this.getAllSubcategories({ categoryId });
  }
}

export default new SubcategoryService();

