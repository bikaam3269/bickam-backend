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
  action: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Action for vendor (e.g., vendor_id, link, etc.)'
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

