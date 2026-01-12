import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Government = sequelize.define('Government', {
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
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Display order'
  }
}, {
  tableName: 'governments',
  timestamps: true,
  underscored: true
});

export default Government;

