import { Op } from 'sequelize';
import City from '../models/City.js';
import Government from '../models/Government.js';

class CityService {
  async getAllCities(filters = {}) {
    const { governmentId, search } = filters;
    const where = {};

    if (governmentId) {
      where.governmentId = governmentId;
    }

    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    return await City.findAll({
      where,
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['name', 'ASC']]
    });
  }

  async getCityById(id) {
    const city = await City.findByPk(id, {
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'code']
        }
      ]
    });
    
    if (!city) {
      throw new Error('City not found');
    }
    
    return city;
  }

  async getCitiesByGovernmentId(governmentId) {
    const government = await Government.findByPk(governmentId);
    if (!government) {
      throw new Error('Government not found');
    }

    return await City.findAll({
      where: { governmentId },
      include: [
        {
          model: Government,
          as: 'government',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['name', 'ASC']]
    });
  }

  async createCity(data) {
    const { name, governmentId } = data;

    if (!name || !governmentId) {
      throw new Error('Name and government ID are required');
    }

    // Check if government exists
    const government = await Government.findByPk(governmentId);
    if (!government) {
      throw new Error('Government not found');
    }

    // Check if city with same name already exists in this government
    const existingCity = await City.findOne({
      where: {
        name: name.trim(),
        governmentId
      }
    });

    if (existingCity) {
      throw new Error('City with this name already exists in this government');
    }

    return await City.create({
      name: name.trim(),
      governmentId
    });
  }

  async updateCity(id, data) {
    const city = await City.findByPk(id);
    if (!city) {
      throw new Error('City not found');
    }

    // If updating name, check if it already exists in the same government
    if (data.name && data.name.trim() !== city.name) {
      const existingCity = await City.findOne({
        where: {
          name: data.name.trim(),
          governmentId: city.governmentId
        }
      });

      if (existingCity) {
        throw new Error('City with this name already exists in this government');
      }
    }

    // If updating governmentId, check if new government exists
    if (data.governmentId && data.governmentId !== city.governmentId) {
      const government = await Government.findByPk(data.governmentId);
      if (!government) {
        throw new Error('Government not found');
      }
    }

    Object.assign(city, data);
    if (data.name) {
      city.name = data.name.trim();
    }
    await city.save();
    
    return await this.getCityById(id);
  }

  async deleteCity(id) {
    const city = await City.findByPk(id);
    if (!city) {
      throw new Error('City not found');
    }

    await city.destroy();
    return true;
  }
}

export default new CityService();

