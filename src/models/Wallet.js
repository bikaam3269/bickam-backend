import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: User,
      key: 'id'
    },
    field: 'user_id'
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'wallets',
  timestamps: true,
  underscored: true
});

// Define association
Wallet.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

export default Wallet;

