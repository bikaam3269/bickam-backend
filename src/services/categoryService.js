import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';

class CategoryService {
  async getAllCategories() {
    const categories = await Category.findAll({
      include: [{
        model: Subcategory,
        as: 'subcategories',
        attributes: ['id', 'name', 'description']
      }],
      order: [['createdAt', 'DESC']]
    });

    return categories;
  }

  async getCategoryById(id) {
    const category = await Category.findByPk(id, {
      include: [{
        model: Subcategory,
        as: 'subcategories',
        attributes: ['id', 'name', 'description']
      }]
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  async createCategory(data) {
    const { name, description } = data;

    if (!name) {
      throw new Error('Category name is required');
    }

    // Check if category with same name exists
    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory) {
      throw new Error('Category with this name already exists');
    }

    const category = await Category.create({
      name,
      description: description || null
    });

    return category;
  }

  async updateCategory(id, data) {
    const category = await Category.findByPk(id);
    if (!category) {
      throw new Error('Category not found');
    }

    // If updating name, check if it's already taken
    if (data.name && data.name !== category.name) {
      const existingCategory = await Category.findOne({ where: { name: data.name } });
      if (existingCategory) {
        throw new Error('Category with this name already exists');
      }
    }

    Object.assign(category, data);
    await category.save();

    return category;
  }

  async deleteCategory(id) {
    const category = await Category.findByPk(id);
    if (!category) {
      throw new Error('Category not found');
    }

    // Check if category has subcategories
    const subcategoriesCount = await Subcategory.count({ where: { categoryId: id } });
    if (subcategoriesCount > 0) {
      throw new Error('Cannot delete category with existing subcategories');
    }

    await category.destroy();
    return { message: 'Category deleted successfully' };
  }
}

export default new CategoryService();

