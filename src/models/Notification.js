import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from './User.js';

const Notification = sequelize.define('Notification', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    validate: {
      notEmpty: true
    }
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Notification type: login_success, order_created, etc.'
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional notification data as JSON',
    get() {
      const rawValue = this.getDataValue('data');
      // If it's already an object, return it
      if (rawValue === null || rawValue === undefined) {
        return null;
      }
      if (typeof rawValue === 'object') {
        return rawValue;
      }
      // If it's a string, try to parse it
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          console.error('Failed to parse notification data:', e);
          return null;
        }
      }
      return rawValue;
    }
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_read'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'read_at'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    field: 'sent_at'
  },
  fcmSent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'fcm_sent',
    comment: 'Whether the notification was sent via FCM'
  },
  fcmError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'fcm_error',
    comment: 'FCM error message if sending failed'
  },
  // Virtual field to extract 'id' from data based on type
  relatedId: {
    type: DataTypes.VIRTUAL,
    get() {
      const data = this.get('data');
      if (!data || typeof data !== 'object') {
        return null;
      }
      // Return 'id' from data if exists, otherwise try type-specific fields
      if (data.id) {
        return data.id;
      }
      // Fallback to type-specific ID fields
      if (data.liveStreamId) return data.liveStreamId.toString();
      if (data.orderId) return data.orderId.toString();
      if (data.productId) return data.productId.toString();
      if (data.vendorId) return data.vendorId.toString();
      if (data.followerId) return data.followerId.toString();
      return null;
    }
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  defaultScope: {
    attributes: {
      include: ['relatedId']
    }
  },
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['is_read']
    },
    {
      fields: ['type']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Define associations
Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

export default Notification;

