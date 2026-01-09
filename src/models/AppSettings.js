import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const AppSettings = sequelize.define('AppSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
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
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  isLiveStreamEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_live_stream_enabled'
  },
  isLoginEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_login_enabled'
  },
  isUnderDevelopment: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_under_development'
  },
  // Section Status Fields
  isBannersActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_banners_active'
  },
  isProductsActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_products_active'
  },
  isCategoryActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_category_active'
  },
  isVendorsActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_vendors_active'
  },
  isMarketplaceActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_marketplace_active'
  },
  // Section Order Fields
  bannersOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'banners_order'
  },
  productsOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    field: 'products_order'
  },
  categoryOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    field: 'category_order'
  },
  livestreamOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4,
    field: 'livestream_order'
  },
  vendorsOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    field: 'vendors_order'
  },
  marketplaceOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 6,
    field: 'marketplace_order'
  }
}, {
  tableName: 'app_settings',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['name']
    }
  ]
});

export default AppSettings;

