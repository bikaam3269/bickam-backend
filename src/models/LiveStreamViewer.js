import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const LiveStreamViewer = sequelize.define('LiveStreamViewer', {
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
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'joined_at'
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'left_at'
  }
}, {
  tableName: 'live_stream_viewers',
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
LiveStreamViewer.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

export default LiveStreamViewer;

