import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const Order = sequelize.define('Order', {
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
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    field: 'vendor_id'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  shippingAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'shipping_address'
  },
  paymentMethod: {
    type: DataTypes.ENUM('wallet', 'cash', 'card'),
    allowNull: false,
    defaultValue: 'wallet',
    field: 'payment_method'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'payment_status'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  underscored: true
});

// Define associations
Order.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Order.belongsTo(User, {
  foreignKey: 'vendorId',
  as: 'vendor'
});

export default Order;

