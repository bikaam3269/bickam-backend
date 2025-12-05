import { Op } from 'sequelize';
import Government from '../models/Government.js';
import City from '../models/City.js';

class GovernmentService {
  async getAllGovernments(filters = {}) {
    const { search } = filters;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }

    return await Government.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  async getAllGovernmentsWithCities(filters = {}) {
    const { search } = filters;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }

    const governments = await Government.findAll({
      where,
      include: [
        {
          model: City,
          as: 'cities',
          attributes: ['id', 'name'],
          separate: true,
          order: [['name', 'ASC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return governments;
  }

  async getGovernmentById(id) {
    const government = await Government.findByPk(id);
    if (!government) {
      throw new Error('Government not found');
    }
    return government;
  }

  async getGovernmentByCode(code) {
    const government = await Government.findOne({ where: { code } });
    if (!government) {
      throw new Error('Government not found');
    }
    return government;
  }

  async createGovernment(data) {
    // Check if code already exists
    const existingGovernment = await Government.findOne({ where: { code: data.code } });
    if (existingGovernment) {
      throw new Error('Government code already exists');
    }

    return await Government.create(data);
  }

  async updateGovernment(id, data) {
    const government = await Government.findByPk(id);
    if (!government) {
      throw new Error('Government not found');
    }

    // If updating code, check if it's already taken by another government
    if (data.code && data.code !== government.code) {
      const existingGovernment = await Government.findOne({ where: { code: data.code } });
      if (existingGovernment) {
        throw new Error('Government code already exists');
      }
    }

    Object.assign(government, data);
    await government.save();
    return government;
  }

  async deleteGovernment(id) {
    const government = await Government.findByPk(id);
    if (!government) {
      throw new Error('Government not found');
    }

    await government.destroy();
    return true;
  }

}

export default new GovernmentService();

