import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';
import Category from './Category.js';
import Subcategory from './Subcategory.js';

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    validate: {
      isArray(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Images must be an array');
        }
      }
    }
  },
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    field: 'vendor_id'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  isPrice: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_price'
  },
  description: {
    type: DataTypes.TEXT,
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
  },
  subcategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Subcategory,
      key: 'id'
    },
    field: 'subcategory_id'
  },
  discount: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true
});

// Define associations
Product.belongsTo(User, {
  foreignKey: 'vendorId',
  as: 'vendor'
});

Product.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

Product.belongsTo(Subcategory, {
  foreignKey: 'subcategoryId',
  as: 'subcategory'
});

export default Product;

