import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import { config } from '../config/app.js';

// Helper function to construct full image URL
const getImageUrl = (filename) => {
  if (!filename) return null;
  const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;
  return `${baseUrl}/files/${filename}`;
};

// Helper function to transform category data
const transformCategory = (category) => {
  if (!category) return category;
  
  const categoryData = category.toJSON ? category.toJSON() : category;
  
  if (categoryData.image) {
    categoryData.image = getImageUrl(categoryData.image);
  }
  
  return categoryData;
};

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

    return categories.map(transformCategory);
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

    return transformCategory(category);
  }

  async createCategory(data) {
    const { name, description, image } = data;

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
      description: description || null,
      image: image || null
    });

    return transformCategory(category);
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

    return transformCategory(category);
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

