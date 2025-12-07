import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const MarketplaceSettings = sequelize.define('MarketplaceSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
}, {
  tableName: 'marketplace_settings',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['key'],
      unique: true
    }
  ]
});

export default MarketplaceSettings;

