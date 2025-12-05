import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import City from './City.js';

const Shipping = sequelize.define('Shipping', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fromCityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: City,
      key: 'id'
    },
    field: 'from_city_id'
  },
  toCityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: City,
      key: 'id'
    },
    field: 'to_city_id'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'shippings',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['from_city_id']
    },
    {
      fields: ['to_city_id']
    },
    {
      unique: true,
      fields: ['from_city_id', 'to_city_id']
    }
  ]
});

// Associations will be defined in models/index.js to avoid circular dependency

export default Shipping;

