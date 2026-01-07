import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Order from './Order.js';
import Product from './Product.js';

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Order,
      key: 'id'
    },
    field: 'order_id'
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
    validate: {
      min: 1
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
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
  tableName: 'order_items',
  timestamps: true,
  underscored: true
});

// Define associations
OrderItem.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order'
});

OrderItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

export default OrderItem;

