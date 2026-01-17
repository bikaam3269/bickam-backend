import { Op } from 'sequelize';
import Banner from '../models/Banner.js';
import { getImagePath } from '../utils/imageHelper.js';

// Helper function to transform banner data
const transformBanner = (banner) => {
  if (!banner) return banner;
  
  const bannerData = banner.toJSON ? banner.toJSON() : banner;
  
  if (bannerData.image) {
    bannerData.image = getImagePath(bannerData.image);
  }
  
  return bannerData;
};

class BannerService {
  async getAllBanners(includeInactive = false, filters = {}) {
    const where = includeInactive ? {} : { isActive: true };
    
    // Add optional filters
    if (filters.actionType) {
      where.actionType = filters.actionType;
    }
    
    if (filters.vendorId) {
      // Filter by vendorId - when actionType is 'vendor', action should match vendorId
      where.actionType = 'vendor';
      where.action = filters.vendorId.toString();
    }
    
    if (filters.productId) {
      // Filter by productId - when actionType is 'product', action should match productId
      where.actionType = 'product';
      where.action = filters.productId.toString();
    }
    
    if (filters.governorateId) {
      // Filter by governorateId - if Banner model has governmentId field
      // Note: This will only work if Banner model has governmentId field
      // If not, you may need to add it via migration or use a join
      where.governmentId = filters.governorateId;
    }
    
    if (filters.action) {
      // Filter by exact action match
      where.action = filters.action;
    }
    
    const banners = await Banner.findAll({
      where,
      order: [['order', 'ASC'], ['createdAt', 'DESC']]
    });

    return banners.map(transformBanner);
  }

  async getBannerById(id) {
    const banner = await Banner.findByPk(id);

    if (!banner) {
      throw new Error('Banner not found');
    }

    return transformBanner(banner);
  }

  async createBanner(data) {
    const { image, text, type, actionType, action, isActive, order } = data;

    if (!image) {
      throw new Error('Banner image is required');
    }

    // Validate actionType and action combination
    if (actionType && !['vendor', 'product', 'link', 'advertisement'].includes(actionType)) {
      throw new Error('Invalid actionType. Must be one of: vendor, product, link, advertisement');
    }

    // If actionType is provided (except advertisement), action should also be provided
    if (actionType && actionType !== 'advertisement' && !action) {
      throw new Error('Action value is required when actionType is specified (except for advertisement)');
    }

    // Advertisement banners don't need action
    if (actionType === 'advertisement' && action) {
      throw new Error('Advertisement banners should not have an action value');
    }

    // Determine type if not provided
    let bannerType = type;
    if (!bannerType) {
      // If actionType is 'advertisement', set type to 'advertisement'
      if (actionType === 'advertisement') {
        bannerType = 'advertisement';
      } else if (action || actionType) {
        // If has action or actionType (vendor, product, link), set type to 'interactive'
        bannerType = 'interactive';
      } else {
        // Default to 'interactive'
        bannerType = 'interactive';
      }
    }

    const banner = await Banner.create({
      image,
      text: text || null,
      type: bannerType,
      actionType: actionType || null,
      action: action || null,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    return transformBanner(banner);
  }

  async updateBanner(id, data) {
    const banner = await Banner.findByPk(id);
    if (!banner) {
      throw new Error('Banner not found');
    }

    // Validate actionType if provided
    if (data.actionType && !['vendor', 'product', 'link', 'advertisement'].includes(data.actionType)) {
      throw new Error('Invalid actionType. Must be one of: vendor, product, link, advertisement');
    }

    // Validate type if provided
    if (data.type && !['interactive', 'advertisement'].includes(data.type)) {
      throw new Error('Invalid type. Must be one of: interactive, advertisement');
    }

    // If actionType is provided (new or updated), action should also be provided (except advertisement)
    const finalActionType = data.actionType !== undefined ? data.actionType : banner.actionType;
    const finalAction = data.action !== undefined ? data.action : banner.action;
    
    if (finalActionType && finalActionType !== 'advertisement' && !finalAction) {
      throw new Error('Action value is required when actionType is specified (except for advertisement)');
    }

    // Advertisement banners don't need action
    if (finalActionType === 'advertisement' && finalAction) {
      throw new Error('Advertisement banners should not have an action value');
    }

    // Determine type if not provided
    let bannerType = data.type;
    if (!bannerType) {
      // If actionType is 'advertisement', set type to 'advertisement'
      if (finalActionType === 'advertisement') {
        bannerType = 'advertisement';
      } else if (finalAction || finalActionType) {
        // If has action or actionType (vendor, product, link), set type to 'interactive'
        bannerType = 'interactive';
      } else {
        // Keep existing type or default to 'interactive'
        bannerType = banner.type || 'interactive';
      }
    }

    // Update banner with type
    Object.assign(banner, { ...data, type: bannerType });
    await banner.save();

    return transformBanner(banner);
  }

  async deleteBanner(id) {
    const banner = await Banner.findByPk(id);
    if (!banner) {
      throw new Error('Banner not found');
    }

    await banner.destroy();
    return { message: 'Banner deleted successfully' };
  }

  async getAdvertisementBanners(includeInactive = false) {
    const where = { type: 'advertisement' };
    
    if (!includeInactive) {
      where.isActive = true;
    }
    
    const banners = await Banner.findAll({
      where,
      order: [['order', 'ASC'], ['createdAt', 'DESC']]
    });

    return banners.map(transformBanner);
  }

  async reorderBanners(banners) {
    const updatePromises = banners.map(({ id, order }) => {
      return Banner.update({ order }, { where: { id } });
    });

    await Promise.all(updatePromises);

    // Get all banners ordered by their new order
    const allBanners = await Banner.findAll({
      order: [['order', 'ASC'], ['createdAt', 'DESC']]
    });

    return allBanners.map(transformBanner);
  }
}

export default new BannerService();



