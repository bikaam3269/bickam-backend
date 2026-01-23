import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Government from './Government.js';
import Category from './Category.js';
import City from './City.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM('user', 'vendor', 'admin', 'marketing'),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail(value) {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error('Email must be a valid email address');
        }
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255]
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isRequiredForMarketing(value) {
        if (this.type === 'marketing' && !value) {
          throw new Error('Phone number is required for marketing users');
        }
      }
    }
  },
  governmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Government,
      key: 'id'
    },
    field: 'government_id',
    validate: {
      isRequiredForMarketing(value) {
        if (this.type === 'marketing' && !value) {
          throw new Error('Government is required for marketing users');
        }
      }
    }
  },
  cityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: City,
      key: 'id'
    },
    field: 'city_id'
  },
  // Vendor specific fields
  activity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Category,
      key: 'id'
    },
    field: 'category_id'
  },
  logoImage: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'logo_image'
  },
  backgroundImage: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'background_image'
  },
  // Vendor location fields
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    },
    comment: 'Vendor location latitude'
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    },
    comment: 'Vendor location longitude'
  },
  // Vendor contact fields
  whatsappNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'whatsapp_number',
    comment: 'Vendor WhatsApp contact number'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Vendor physical address'
  },
  // Verification fields
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true, // Users are verified by default
    field: 'is_verified'
  },
  verificationCode: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'verification_code'
  },
  verificationCodeExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verification_code_expiry'
  },
  // Firebase Cloud Messaging token
  fcmToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'fcm_token'
  },
  // Vendor live stream permission
  canMakeLiveStream: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'can_make_live_stream',
    comment: 'Whether vendor can create live streams'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

// Define associations
User.belongsTo(Government, {
  foreignKey: 'governmentId',
  as: 'government'
});

User.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

// Note: City association is defined in models/index.js to avoid circular dependency
// Note: Notification association is defined in Notification model
// User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

export default User;
