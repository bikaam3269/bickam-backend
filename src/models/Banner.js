import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Banner = sequelize.define('Banner', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  type: {
    type: DataTypes.ENUM('interactive', 'advertisement'),
    allowNull: false,
    defaultValue: 'interactive',
    comment: 'Banner type: interactive (has action) or advertisement (image only)'
  },
  actionType: {
    type: DataTypes.ENUM('vendor', 'product', 'link', 'advertisement'),
    allowNull: true,
    field: 'action_type',
    comment: 'Type of action: vendor, product, link, or advertisement (image only)'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Action value: vendor_id, product_id, or link URL based on action_type'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Display order'
  }
}, {
  tableName: 'banners',
  timestamps: true,
  underscored: true
});

export default Banner;



