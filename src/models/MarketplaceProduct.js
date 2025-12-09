import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const MarketplaceProduct = sequelize.define('MarketplaceProduct', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  files: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('files');
      if (Array.isArray(rawValue)) {
        return rawValue;
      }
      if (typeof rawValue === 'string') {
        try {
          const parsed = JSON.parse(rawValue);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }
      return [];
    },
    validate: {
      isArray(value) {
        if (value && !Array.isArray(value)) {
          throw new Error('Files must be an array');
        }
      }
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  isNegotiable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_negotiable',
    comment: 'Whether the price is negotiable'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    field: 'admin_id'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at',
    comment: 'Auto-delete date based on admin settings'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    field: 'rejection_reason'
  }
}, {
  tableName: 'marketplace_products',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['expires_at']
    }
  ]
});

// Define associations
MarketplaceProduct.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

MarketplaceProduct.belongsTo(User, {
  foreignKey: 'adminId',
  as: 'admin'
});

export default MarketplaceProduct;

