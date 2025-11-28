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
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    validate: {
      notEmpty: true
    }
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('images');
      // If it's already an array, return it
      if (Array.isArray(rawValue)) {
        return rawValue;
      }
      // If it's a string, try to parse it
      if (typeof rawValue === 'string') {
        try {
          const parsed = JSON.parse(rawValue);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }
      // If it's null or undefined, return empty array
      return [];
    },
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
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
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
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Product quantity in stock'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether the product is active/available'
  },
  originalPrice: {
    type: DataTypes.VIRTUAL,
    get() {
      const price = this.getDataValue('price');
      return price ? parseFloat(price) : null;
    }
  },
  finalPrice: {
    type: DataTypes.VIRTUAL,
    get() {
      const price = this.getDataValue('price');
      const discount = this.getDataValue('discount');

      if (!price) return null;

      const priceNum = parseFloat(price);
      const discountNum = parseFloat(discount) || 0;

      if (discountNum > 0) {
        const discountAmount = (priceNum * discountNum) / 100;
        return parseFloat((priceNum - discountAmount).toFixed(2));
      }

      return priceNum;
    }
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true,
  defaultScope: {
    attributes: {
      include: ['originalPrice', 'finalPrice']
    }
  }
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

