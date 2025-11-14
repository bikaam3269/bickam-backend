import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';
import Product from './Product.js';

const Favorite = sequelize.define('Favorite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    field: 'user_id'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    },
    field: 'product_id'
  }
}, {
  tableName: 'favorites',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'product_id']
    }
  ]
});

// Define associations
Favorite.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Favorite.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

export default Favorite;

