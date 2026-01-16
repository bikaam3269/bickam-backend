import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const ProductSection = sequelize.define('ProductSection', {
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
    },
    comment: 'Section name'
  },
  type: {
    type: DataTypes.ENUM('vendor', 'category', 'bestSellers', 'lastAdded'),
    allowNull: false,
    comment: 'Section type: vendor, category, bestSellers, or lastAdded'
  },
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'vendor_id',
    comment: 'Vendor ID (required if type is vendor)',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'category_id',
    comment: 'Category ID (required if type is category)',
    references: {
      model: 'categories',
      key: 'id'
    }
  },
 
  image: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Section image (optional)'
  },
  rows: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Number of rows to display (1-10)'
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Display order'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: 'Section active status'
  },
  appSettingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'app_setting_id',
    comment: 'App Settings ID (links to app_settings table)',
    references: {
      model: 'app_settings',
      key: 'id'
    }
  }
}, {
  tableName: 'product_sections',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['vendor_id']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['order']
    },
    {
      fields: ['app_setting_id']
    }
  ]
});

export default ProductSection;
