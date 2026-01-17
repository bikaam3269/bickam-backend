import AppSettings from '../models/AppSettings.js';
import ProductSection from '../models/ProductSection.js';
import Banner from '../models/Banner.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import sequelize from '../config/sequelize.js';
import { Op } from 'sequelize';
import { getImagePath } from '../utils/imageHelper.js';

class AppSettingsService {
  /**
   * Get all app settings
   * @returns {Promise<Array>} Array of app settings
   */
  async getAllSettings() {
    return await AppSettings.findAll({
      order: [['createdAt', 'ASC']]
    });
  }

  /**
   * Get app settings by name
   * @param {string} name - Setting name
   * @param {boolean} includeSections - Include product sections and interactive banners
   * @returns {Promise<object|null>} App setting or null
   */
  async getSettingByName(name, includeSections = false) {
    const settings = await AppSettings.findOne({
      where: { name },
      include: includeSections ? [
        {
          model: ProductSection,
          as: 'productSections',
          include: [
            {
              model: User,
              as: 'vendor',
              attributes: ['id', 'name', 'phone', 'logoImage'],
              required: false
            },
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'image'],
              required: false
            }
          ],
          separate: true,
          order: [['order', 'ASC'], [sequelize.literal('`ProductSection`.`created_at`'), 'DESC']]
        }
      ] : []
    });
    
    if (settings && includeSections) {
      // Transform settings to ensure productSections is properly formatted
      const settingsData = settings.toJSON ? settings.toJSON() : settings;
      
      // Remove productsOrder as it's not an added section
      if (settingsData.productsOrder !== undefined) {
        delete settingsData.productsOrder;
      }
      
      // Ensure productSections is always an array
      if (!settingsData.productSections) {
        settingsData.productSections = [];
      }
      
      // Transform product sections to ensure all fields are present
      settingsData.productSections = settingsData.productSections.map(section => {
        const sectionData = section.toJSON ? section.toJSON() : section;
        
        // Ensure name, isActive, and order are always present
        return {
          ...sectionData,
          name: sectionData.name || '',
          isActive: sectionData.isActive !== undefined ? sectionData.isActive : true,
          order: sectionData.order !== undefined ? sectionData.order : 0
        };
      });

      // Get interactive banners (type = 'interactive')
      const interactiveBanners = await Banner.findAll({
        where: {
          isActive: true,
          type: 'interactive'
        },
        order: [['order', 'ASC'], ['createdAt', 'DESC']],
        attributes: ['id', 'image', 'text', 'type', 'actionType', 'action', 'isActive', 'order', 'createdAt', 'updatedAt']
      });

      // Transform banners with image paths
      settingsData.interactiveBanners = interactiveBanners.map(banner => {
        const bannerData = banner.toJSON ? banner.toJSON() : banner;
        
        if (bannerData.image) {
          bannerData.image = getImagePath(bannerData.image);
        }
        
        return bannerData;
      });
      
      return settingsData;
    }
    
    return settings;
  }

  /**
   * Get main app settings (default: 'app_main')
   * @param {boolean} includeSections - Include product sections
   * @returns {Promise<object|null>} Main app settings or null
   */
  async getMainSettings(includeSections = true) {
    return await this.getSettingByName('app_main', includeSections);
  }

  /**
   * Create app settings
   * @param {object} data - Settings data
   * @returns {Promise<object>} Created settings
   */
  async createSettings(data) {
    const { 
      name, description, value, 
      isLiveStreamEnabled, isLoginEnabled, isUnderDevelopment,
      isBannersActive, isProductsActive, isCategoryActive,
      isVendorsActive, isMarketplaceActive,
      bannersOrder, productsOrder, categoryOrder,
      livestreamOrder, vendorsOrder, marketplaceOrder
    } = data;

    if (!name) {
      throw new Error('Name is required');
    }

    // Check if name already exists
    const existing = await this.getSettingByName(name);
    if (existing) {
      throw new Error('Setting with this name already exists');
    }

    return await AppSettings.create({
      name,
      description: description || null,
      value: value || null,
      isLiveStreamEnabled: isLiveStreamEnabled !== undefined ? isLiveStreamEnabled : true,
      isLoginEnabled: isLoginEnabled !== undefined ? isLoginEnabled : true,
      isUnderDevelopment: isUnderDevelopment !== undefined ? isUnderDevelopment : false,
      isBannersActive: isBannersActive !== undefined ? isBannersActive : true,
      isProductsActive: isProductsActive !== undefined ? isProductsActive : true,
      isCategoryActive: isCategoryActive !== undefined ? isCategoryActive : true,
      isVendorsActive: isVendorsActive !== undefined ? isVendorsActive : true,
      isMarketplaceActive: isMarketplaceActive !== undefined ? isMarketplaceActive : true,
      bannersOrder: bannersOrder !== undefined ? bannersOrder : 1,
      productsOrder: productsOrder !== undefined ? productsOrder : 2,
      categoryOrder: categoryOrder !== undefined ? categoryOrder : 3,
      livestreamOrder: livestreamOrder !== undefined ? livestreamOrder : 4,
      vendorsOrder: vendorsOrder !== undefined ? vendorsOrder : 5,
      marketplaceOrder: marketplaceOrder !== undefined ? marketplaceOrder : 6
    });
  }

  /**
   * Update app settings
   * @param {number} id - Settings ID
   * @param {object} data - Updated data
   * @returns {Promise<object>} Updated settings
   */
  async updateSettings(id, data) {
    const settings = await AppSettings.findByPk(id);
    if (!settings) {
      throw new Error('App settings not found');
    }

    const { 
      name, description, value, 
      isLiveStreamEnabled, isLoginEnabled, isUnderDevelopment,
      isBannersActive, isProductsActive, isCategoryActive,
      isVendorsActive, isMarketplaceActive,
      bannersOrder, productsOrder, categoryOrder,
      livestreamOrder, vendorsOrder, marketplaceOrder
    } = data;

    // If name is being updated, check if it already exists
    if (name && name !== settings.name) {
      const existing = await this.getSettingByName(name);
      if (existing) {
        throw new Error('Setting with this name already exists');
      }
    }

    // Update fields
    if (name !== undefined) settings.name = name;
    if (description !== undefined) settings.description = description;
    if (value !== undefined) settings.value = value;
    if (isLiveStreamEnabled !== undefined) settings.isLiveStreamEnabled = isLiveStreamEnabled;
    if (isLoginEnabled !== undefined) settings.isLoginEnabled = isLoginEnabled;
    if (isUnderDevelopment !== undefined) settings.isUnderDevelopment = isUnderDevelopment;
    if (isBannersActive !== undefined) settings.isBannersActive = isBannersActive;
    if (isProductsActive !== undefined) settings.isProductsActive = isProductsActive;
    if (isCategoryActive !== undefined) settings.isCategoryActive = isCategoryActive;
    if (isVendorsActive !== undefined) settings.isVendorsActive = isVendorsActive;
    if (isMarketplaceActive !== undefined) settings.isMarketplaceActive = isMarketplaceActive;
    if (bannersOrder !== undefined) settings.bannersOrder = bannersOrder;
    if (productsOrder !== undefined) settings.productsOrder = productsOrder;
    if (categoryOrder !== undefined) settings.categoryOrder = categoryOrder;
    if (livestreamOrder !== undefined) settings.livestreamOrder = livestreamOrder;
    if (vendorsOrder !== undefined) settings.vendorsOrder = vendorsOrder;
    if (marketplaceOrder !== undefined) settings.marketplaceOrder = marketplaceOrder;

    await settings.save();
    return settings;
  }

  /**
   * Update main app settings
   * @param {object} data - Updated data
   * @returns {Promise<object>} Updated settings
   */
  async updateMainSettings(data) {
    const mainSettings = await this.getMainSettings();
    if (!mainSettings) {
      // Create if doesn't exist
      return await this.createSettings({
        name: 'app_main',
        description: 'Main App Settings',
        ...data
      });
    }

    return await this.updateSettings(mainSettings.id, data);
  }

  /**
   * Delete app settings
   * @param {number} id - Settings ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteSettings(id) {
    const settings = await AppSettings.findByPk(id);
    if (!settings) {
      throw new Error('App settings not found');
    }

    // Prevent deleting main settings
    if (settings.name === 'app_main') {
      throw new Error('Cannot delete main app settings');
    }

    await settings.destroy();
    return true;
  }

  /**
   * Check if live stream is enabled
   * @returns {Promise<boolean>} True if enabled
   */
  async isLiveStreamEnabled() {
    const mainSettings = await this.getMainSettings();
    return mainSettings ? mainSettings.isLiveStreamEnabled : true; // Default to true
  }

  /**
   * Check if login is enabled
   * @returns {Promise<boolean>} True if enabled
   */
  async isLoginEnabled() {
    const mainSettings = await this.getMainSettings();
    return mainSettings ? mainSettings.isLoginEnabled : true; // Default to true
  }

  /**
   * Check if app is under development
   * @returns {Promise<boolean>} True if under development
   */
  async isUnderDevelopment() {
    const mainSettings = await this.getMainSettings();
    return mainSettings ? mainSettings.isUnderDevelopment : false; // Default to false
  }
}

export default new AppSettingsService();

