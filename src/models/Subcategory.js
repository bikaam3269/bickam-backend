import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Category from './Category.js';

const Subcategory = sequelize.define('Subcategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Category,
      key: 'id'
    },
    field: 'category_id'
  }
}, {
  tableName: 'subcategories',
  timestamps: true,
  underscored: true
});

// Define association
Subcategory.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

export default Subcategory;

