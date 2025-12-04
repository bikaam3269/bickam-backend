import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import LiveStream from './LiveStream.js';
import User from './User.js';

const LiveStreamMessage = sequelize.define('LiveStreamMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  liveStreamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: LiveStream,
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
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    validate: {
      notEmpty: true,
      len: [1, 500]
    }
  }
}, {
  tableName: 'live_stream_messages',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['live_stream_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Define associations
LiveStreamMessage.belongsTo(LiveStream, {
  foreignKey: 'liveStreamId',
  as: 'liveStream'
});

LiveStreamMessage.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

export default LiveStreamMessage;

