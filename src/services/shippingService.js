import { Op } from 'sequelize';
import Shipping from '../models/Shipping.js';
import City from '../models/City.js';
import Government from '../models/Government.js';

class ShippingService {
  async getAllShippings(filters = {}) {
    const { fromCityId, toCityId, search } = filters;
    const where = {};

    if (fromCityId) {
      where.fromCityId = fromCityId;
    }

    if (toCityId) {
      where.toCityId = toCityId;
    }

    return await Shipping.findAll({
      where,
      include: [
        {
          model: City,
          as: 'fromCity',
          attributes: ['id', 'name'],
          include: [
            {
              model: Government,
              as: 'government',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        {
          model: City,
          as: 'toCity',
          attributes: ['id', 'name'],
          include: [
            {
              model: Government,
              as: 'government',
              attributes: ['id', 'name', 'code']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async getShippingById(id) {
    const shipping = await Shipping.findByPk(id, {
      include: [
        {
          model: City,
          as: 'fromCity',
          attributes: ['id', 'name'],
          include: [
            {
              model: Government,
              as: 'government',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        {
          model: City,
          as: 'toCity',
          attributes: ['id', 'name'],
          include: [
            {
              model: Government,
              as: 'government',
              attributes: ['id', 'name', 'code']
            }
          ]
        }
      ]
    });
    
    if (!shipping) {
      throw new Error('Shipping not found');
    }
    
    return shipping;
  }

  async getShippingPrice(fromCityId, toCityId) {
    const shipping = await Shipping.findOne({
      where: {
        fromCityId,
        toCityId
      },
      include: [
        {
          model: City,
          as: 'fromCity',
          attributes: ['id', 'name']
        },
        {
          model: City,
          as: 'toCity',
          attributes: ['id', 'name']
        }
      ]
    });
    
    if (!shipping) {
      throw new Error('Shipping price not found for this route');
    }
    
    return shipping;
  }

  async createShipping(data) {
    const { fromCityId, toCityId, price } = data;

    if (!fromCityId || !toCityId || price === undefined || price === null) {
      throw new Error('From city, to city, and price are required');
    }

    if (fromCityId === toCityId) {
      throw new Error('From city and to city cannot be the same');
    }

    // Check if cities exist
    const fromCity = await City.findByPk(fromCityId);
    if (!fromCity) {
      throw new Error('From city not found');
    }

    const toCity = await City.findByPk(toCityId);
    if (!toCity) {
      throw new Error('To city not found');
    }

    // Check if shipping already exists
    const existingShipping = await Shipping.findOne({
      where: {
        fromCityId,
        toCityId
      }
    });

    if (existingShipping) {
      throw new Error('Shipping price already exists for this route');
    }

    return await Shipping.create({
      fromCityId,
      toCityId,
      price: parseFloat(price)
    });
  }

  async updateShipping(id, data) {
    const shipping = await Shipping.findByPk(id);
    if (!shipping) {
      throw new Error('Shipping not found');
    }

    // If updating cities, check if they exist
    if (data.fromCityId) {
      const fromCity = await City.findByPk(data.fromCityId);
      if (!fromCity) {
        throw new Error('From city not found');
      }
    }

    if (data.toCityId) {
      const toCity = await City.findByPk(data.toCityId);
      if (!toCity) {
        throw new Error('To city not found');
      }
    }

    // Check if from and to are the same
    const finalFromCityId = data.fromCityId || shipping.fromCityId;
    const finalToCityId = data.toCityId || shipping.toCityId;
    
    if (finalFromCityId === finalToCityId) {
      throw new Error('From city and to city cannot be the same');
    }

    // Check if new route already exists (if cities are being changed)
    if (data.fromCityId || data.toCityId) {
      const existingShipping = await Shipping.findOne({
        where: {
          fromCityId: finalFromCityId,
          toCityId: finalToCityId,
          id: { [Op.ne]: id }
        }
      });

      if (existingShipping) {
        throw new Error('Shipping price already exists for this route');
      }
    }

    Object.assign(shipping, data);
    if (data.price !== undefined) {
      shipping.price = parseFloat(data.price);
    }
    await shipping.save();
    
    return await this.getShippingById(id);
  }

  async deleteShipping(id) {
    const shipping = await Shipping.findByPk(id);
    if (!shipping) {
      throw new Error('Shipping not found');
    }

    await shipping.destroy();
    return true;
  }

  async getShippingByRoute(fromCityId, toCityId) {
    return await this.getShippingPrice(fromCityId, toCityId);
  }
}

export default new ShippingService();

