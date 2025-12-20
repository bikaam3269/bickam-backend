import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const LiveStream = sequelize.define('LiveStream', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    field: 'vendor_id'
  },
  title: {
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
  channelName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'channel_name'
  },
  agoraToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'agora_token'
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'live', 'ended', 'cancelled'),
    allowNull: false,
    defaultValue: 'scheduled'
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scheduled_at'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'started_at'
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ended_at'
  },
  viewerCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'viewer_count'
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'image'
  }
}, {
  tableName: 'live_streams',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['vendor_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['channel_name']
    }
  ]
});

// Define associations
LiveStream.belongsTo(User, {
  foreignKey: 'vendorId',
  as: 'vendor'
});

// Other associations (hasMany) are defined in models/index.js to avoid circular dependency

export default LiveStream;

