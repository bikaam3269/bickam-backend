import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';
import MarketingProduct from './MarketingProduct.js';

const MarketingCart = sequelize.define('MarketingCart', {
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
    comment: 'User with type "marketing"'
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
    defaultValue: 1,
    validate: {
      min: 1
    }
  }
}, {
  tableName: 'marketing_carts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['marketer_id', 'marketing_product_id']
    }
  ]
});

// Define associations
MarketingCart.belongsTo(User, {
  foreignKey: 'marketerId',
  as: 'marketer'
});

MarketingCart.belongsTo(MarketingProduct, {
  foreignKey: 'marketingProductId',
  as: 'marketingProduct'
});

export default MarketingCart;






