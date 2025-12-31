import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import MarketingOrder from './MarketingOrder.js';
import MarketingProduct from './MarketingProduct.js';

const MarketingOrderItem = sequelize.define('MarketingOrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  marketingOrderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: MarketingOrder,
      key: 'id'
    },
    field: 'marketing_order_id'
  },
  marketingProductId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: MarketingProduct,
      key: 'id'
    },
    field: 'marketing_product_id'
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
    },
    comment: 'Price at the time of order'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'quantity * price'
  }
}, {
  tableName: 'marketing_order_items',
  timestamps: true,
  underscored: true
});

// Define associations
MarketingOrderItem.belongsTo(MarketingOrder, {
  foreignKey: 'marketingOrderId',
  as: 'marketingOrder'
});

MarketingOrderItem.belongsTo(MarketingProduct, {
  foreignKey: 'marketingProductId',
  as: 'marketingProduct'
});

export default MarketingOrderItem;













