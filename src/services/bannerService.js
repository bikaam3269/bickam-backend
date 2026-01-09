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
    if (filters.vendorId) {
      // Filter by vendorId - action field might contain vendor ID
      // Check if action equals vendorId or contains vendorId
      where[Op.or] = [
        { action: filters.vendorId.toString() },
        { action: { [Op.like]: `%${filters.vendorId}%` } }
      ];
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
    const { image, text, action, isActive, order } = data;

    if (!image) {
      throw new Error('Banner image is required');
    }

    const banner = await Banner.create({
      image,
      text: text || null,
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

    Object.assign(banner, data);
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
}

export default new BannerService();



