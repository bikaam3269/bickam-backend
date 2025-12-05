import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const LiveStreamLike = sequelize.define('LiveStreamLike', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  liveStreamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'live_streams',
      key: 'id'
    },
    field: 'live_stream_id'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    field: 'user_id'
  }
}, {
  tableName: 'live_stream_likes',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['live_stream_id', 'user_id']
    },
    {
      fields: ['live_stream_id']
    },
    {
      fields: ['user_id']
    }
  ]
});

// Define associations (will be set up in models/index.js to avoid circular dependency)
LiveStreamLike.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

export default LiveStreamLike;

