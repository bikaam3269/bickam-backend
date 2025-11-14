import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const Follow = sequelize.define('Follow', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  followerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    field: 'follower_id'
  },
  followingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    field: 'following_id'
  }
}, {
  tableName: 'follows',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['follower_id', 'following_id']
    }
  ]
});

// Define associations
Follow.belongsTo(User, {
  foreignKey: 'followerId',
  as: 'follower'
});

Follow.belongsTo(User, {
  foreignKey: 'followingId',
  as: 'following'
});

export default Follow;

