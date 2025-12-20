import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';
import City from './City.js';

const MarketingOrder = sequelize.define('MarketingOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  marketerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    field: 'marketer_id',
    comment: 'User with type "marketing" who placed the order'
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
  fromCityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'from_city_id',
    comment: 'City where marketing product is located'
  },
  toCityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'to_city_id',
    comment: 'City where marketer wants delivery'
  },
  shippingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'shipping_price'
  },
  shippingAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    field: 'shipping_address'
  },
  paymentMethod: {
    type: DataTypes.ENUM('wallet', 'cash', 'card'),
    allowNull: false,
    defaultValue: 'wallet',
    field: 'payment_method'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'remaining'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'payment_status'
  },
  remainingAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'remaining_amount'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'phone',
    comment: 'Marketer phone number for order delivery'
  }
}, {
  tableName: 'marketing_orders',
  timestamps: true,
  underscored: true
});

// Define associations
MarketingOrder.belongsTo(User, {
  foreignKey: 'marketerId',
  as: 'marketer'
});

MarketingOrder.belongsTo(City, {
  foreignKey: 'fromCityId',
  as: 'fromCity'
});

MarketingOrder.belongsTo(City, {
  foreignKey: 'toCityId',
  as: 'toCity'
});

export default MarketingOrder;

