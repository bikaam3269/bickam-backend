import { Op } from 'sequelize';
import User from '../models/User.js';
import Government from '../models/Government.js';
import City from '../models/City.js';

class AffiliateService {
  /**
   * Get all marketers (users with type 'marketing')
   */
  async getMarketers(filters = {}) {
    const { search, governmentId, cityId } = filters;
    const where = {
      type: 'marketing'
    };

    if (governmentId) {
      where.governmentId = governmentId;
    }

    if (cityId) {
      where.cityId = cityId;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const marketers = await User.findAll({
      where,
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'code'],
          required: false
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    return marketers;
  }

  /**
   * Get marketer by ID
   */
  async getMarketerById(id) {
    const marketer = await User.findOne({
      where: {
        id,
        type: 'marketing'
      },
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'code'],
          required: false
        },
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!marketer) {
      throw new Error('Marketer not found');
    }

    return marketer;
  }
}

export default new AffiliateService();




















