import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const WalletRequest = sequelize.define('WalletRequest', {
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
  type: {
    type: DataTypes.ENUM('deposit', 'withdrawal'),
    allowNull: false,
    validate: {
      isIn: [['deposit', 'withdrawal']]
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'approved', 'rejected']]
    }
  },
  evidenceImage: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'evidence_image',
    comment: 'Evidence image for deposit (uploaded by user) or withdrawal (uploaded by admin)'
  },
  walletNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'wallet_number',
    comment: 'Wallet number for withdrawal (e.g., phone number, bank account)'
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    field: 'admin_id',
    comment: 'Admin who processed the request'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Reason for rejection (if rejected)'
  }
}, {
  tableName: 'wallet_requests',
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
      fields: ['type']
    },
    {
      fields: ['admin_id']
    }
  ]
});

// Associations will be defined in models/index.js to avoid circular dependency

export default WalletRequest;

