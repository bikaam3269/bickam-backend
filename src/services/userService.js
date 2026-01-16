import { Op } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from '../models/User.js';
import Government from '../models/Government.js';
import City from '../models/City.js';
import Order from '../models/Order.js';
import Follow from '../models/Follow.js';
import Wallet from '../models/Wallet.js';
import bcrypt from 'bcrypt';

class UserService {
  async getAllUsers(filters = {}) {
    const { 
      type, 
      search, 
      governmentId, 
      status,
      page = 1, 
      limit = 20 
    } = filters;

    const where = {};
    const offset = (page - 1) * limit;

    if (type) {
      where.type = type;
    }

    if (governmentId && governmentId !== 'all') {
      where.governmentId = parseInt(governmentId);
    }

    if (status && status !== 'all') {
      // Assuming status is based on isVerified or a similar field
      if (status === 'active') {
        where.isVerified = true;
      } else if (status === 'blocked') {
        where.isVerified = false;
      }
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'order'],
          required: false
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      attributes: { 
        exclude: ['password'],
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM orders 
              WHERE orders.user_id = User.id
            )`),
            'ordersCount'
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM follows 
              WHERE follows.following_id = User.id
            )`),
            'followersCount'
          ],
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(balance), 0) 
              FROM wallets 
              WHERE wallets.user_id = User.id
            )`),
            'walletBalance'
          ]
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      subQuery: false
    });

    // Format users with statistics
    const formattedUsers = users.map(user => {
      const userJson = user.toJSON();
      return {
        ...userJson,
        orders: parseInt(userJson.ordersCount) || 0,
        followers: parseInt(userJson.followersCount) || 0,
        wallet: parseFloat(userJson.walletBalance) || 0,
        status: userJson.isVerified ? 'active' : 'blocked'
      };
    });

    return {
      users: formattedUsers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        hasMore: offset + users.length < count
      }
    };
  }

  async getUserById(id) {
    const user = await User.findByPk(id, {
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'order']
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name']
        }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async getUserByEmail(email) {
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'order']
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name']
        }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateUser(id, data, file, currentUser) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Only allow users to update their own profile, or admin can update any
    if (currentUser.id !== parseInt(id) && currentUser.type !== 'admin') {
      throw new Error('Unauthorized to update this user');
    }

    // Handle file upload (image)
    if (file) {
      data.logoImage = `/files/${file.filename}`;
    }

    // If password is being updated, hash it
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Update only allowed fields
    const allowedFields = ['name', 'email', 'phone', 'governmentId', 'cityId', 'activity', 'description', 'logoImage'];
    if (user.type === 'user' || user.type === 'admin') {
      // Remove vendor-specific fields for user and admin types
      delete data.activity;
      delete data.description;
      // But allow logoImage for all user types
    }

    // Filter and prepare update data
    const updateData = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        // Handle null values
        if (data[field] === null || data[field] === '' || data[field] === 'null' || data[field] === 'undefined') {
          if (field !== 'password') {
            updateData[field] = null;
          }
        } else {
          // Parse ID fields as integers
          if (field === 'cityId' || field === 'governmentId') {
            const parsedValue = parseInt(data[field], 10);
            updateData[field] = isNaN(parsedValue) ? null : parsedValue;
          } else {
            updateData[field] = data[field];
          }
        }
      }
    });

    Object.assign(user, updateData);
    await user.save();

    // Fetch updated user with associations
    const updatedUser = await User.findByPk(id, {
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'order']
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name']
        }
      ],
      attributes: { exclude: ['password'] }
    });

    return updatedUser;
  }

  async deleteUser(id, currentUser) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Only allow users to delete their own account, or admin can delete any
    if (currentUser.id !== parseInt(id) && currentUser.type !== 'admin') {
      throw new Error('Unauthorized to delete this user');
    }

    await user.destroy();
    return true;
  }

  async getAllUsersForExport(filters = {}) {
    const { type, search, governmentId, status } = filters;
    const where = {};

    if (type) {
      where.type = type;
    }

    if (governmentId && governmentId !== 'all') {
      where.governmentId = parseInt(governmentId);
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        where.isVerified = true;
      } else if (status === 'blocked') {
        where.isVerified = false;
      }
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'order'],
          required: false
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      attributes: { 
        exclude: ['password'],
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM orders 
              WHERE orders.user_id = User.id
            )`),
            'ordersCount'
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM follows 
              WHERE follows.following_id = User.id
            )`),
            'followersCount'
          ],
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(balance), 0) 
              FROM wallets 
              WHERE wallets.user_id = User.id
            )`),
            'walletBalance'
          ]
        ]
      },
      order: [['createdAt', 'DESC']],
      subQuery: false
    });

    // Format users with statistics
    return users.map(user => {
      const userJson = user.toJSON();
      return {
        id: userJson.id,
        name: userJson.name || '',
        email: userJson.email || '',
        phone: userJson.phone || '',
        type: userJson.type || '',
        government: userJson.government?.name || '',
        city: userJson.city?.name || '',
        wallet: parseFloat(userJson.walletBalance) || 0,
        orders: parseInt(userJson.ordersCount) || 0,
        followers: parseInt(userJson.followersCount) || 0,
        status: userJson.isVerified ? 'نشط' : 'محظور',
        createdAt: userJson.createdAt ? new Date(userJson.createdAt).toLocaleDateString('ar-EG') : ''
      };
    });
  }
}

export default new UserService();

