import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Government from './Government.js';

const City = sequelize.define('City', {
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
  governmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Government,
      key: 'id'
    },
    field: 'government_id'
  }
}, {
  tableName: 'cities',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['government_id']
    },
    {
      unique: true,
      fields: ['name', 'government_id']
    }
  ]
});

// Associations will be defined in models/index.js to avoid circular dependency

export default City;

