import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const WalletTransaction = sequelize.define('WalletTransaction', {
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
    type: DataTypes.ENUM('deposit', 'withdrawal', 'payment', 'refund', 'transfer_in', 'transfer_out'),
    allowNull: false,
    comment: 'Transaction type: deposit, withdrawal, payment, refund, transfer_in, transfer_out'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Transaction amount (always positive)'
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'balance_before',
    comment: 'Wallet balance before transaction'
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'balance_after',
    comment: 'Wallet balance after transaction'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Transaction description'
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'reference_id',
    comment: 'Reference to related entity (e.g., order_id, wallet_request_id)'
  },
  referenceType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reference_type',
    comment: 'Type of reference (e.g., order, wallet_request)'
  }
}, {
  tableName: 'wallet_transactions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['reference_id', 'reference_type']
    }
  ]
});

// Define associations
WalletTransaction.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

export default WalletTransaction;


