import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const VendorRating = sequelize.define('VendorRating', {
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
    field: 'user_id',
    comment: 'User who is rating the vendor'
  },
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    field: 'vendor_id',
    comment: 'Vendor being rated'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Rating value from 1 to 5'
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Optional comment/review text'
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Optional: Related order ID if rating is for a specific order'
  }
}, {
  tableName: 'vendor_ratings',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'vendor_id'],
      name: 'unique_user_vendor_rating'
    },
    {
      fields: ['vendor_id']
    },
    {
      fields: ['user_id']
    }
  ]
});

// Define associations
VendorRating.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

VendorRating.belongsTo(User, {
  foreignKey: 'vendorId',
  as: 'vendor'
});

export default VendorRating;

