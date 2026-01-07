import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';
import Product from './Product.js';

const Cart = sequelize.define('Cart', {
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
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  size: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Selected size for the product (optional)'
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Selected color for the product (optional)'
  }
}, {
  tableName: 'carts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'product_id', 'size', 'color'],
      name: 'unique_user_product_size_color'
    }
  ]
});

// Define associations
Cart.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Cart.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

export default Cart;

