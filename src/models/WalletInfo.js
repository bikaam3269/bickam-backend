import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const WalletInfo = sequelize.define('WalletInfo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    validate: {
      notEmpty: true
    },
    comment: 'Wallet name (e.g., Vodafone Cash, InstaPay, Bank Name)'
  },
  walletId: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    },
    field: 'wallet_id',
    comment: 'Wallet identifier (phone number, account number, etc.)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether this wallet info is active and visible to users'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order',
    comment: 'Order for displaying wallet info in lists'
  }
}, {
  tableName: 'wallet_info',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['is_active']
    },
    {
      fields: ['display_order']
    }
  ]
});

export default WalletInfo;

