import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Discount from './Discount.js';
import Product from './Product.js';

const DiscountProduct = sequelize.define('DiscountProduct', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  discountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Discount,
      key: 'id'
    },
    field: 'discount_id',
    onDelete: 'CASCADE'
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
  tableName: 'discount_products',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['product_id'],
      name: 'unique_product_discount'
    },
    {
      fields: ['discount_id']
    }
  ]
});

// Define associations
DiscountProduct.belongsTo(Discount, {
  foreignKey: 'discountId',
  as: 'discount'
});

DiscountProduct.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

export default DiscountProduct;

