import { Op } from 'sequelize';
import User from '../models/User.js';
import Government from '../models/Government.js';
import City from '../models/City.js';
import bcrypt from 'bcrypt';

class UserService {
  async getAllUsers(filters = {}) {
    const { type, search, governmentId } = filters;
    const where = {};

    if (type) {
      where.type = type;
    }

    if (governmentId) {
      where.governmentId = governmentId;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'code']
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name']
        }
      ],
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    return users;
  }

  async getUserById(id) {
    const user = await User.findByPk(id, {
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'code']
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
          attributes: ['id', 'name', 'code']
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

  async updateUser(id, data, currentUser) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Only allow users to update their own profile, or admin can update any
    if (currentUser.id !== parseInt(id) && currentUser.type !== 'admin') {
      throw new Error('Unauthorized to update this user');
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
      delete data.logoImage;
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
          attributes: ['id', 'name', 'code']
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
}

export default new UserService();

