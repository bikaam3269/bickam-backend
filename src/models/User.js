import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import Government from './Government.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM('user', 'vendor', 'admin'),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
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
    allowNull: true
  },
  governmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Government,
      key: 'id'
    },
    field: 'government_id'
  },
  // Vendor specific fields
  activity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  logoImage: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'logo_image'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

// Define association
User.belongsTo(Government, {
  foreignKey: 'governmentId',
  as: 'government'
});

export default User;
