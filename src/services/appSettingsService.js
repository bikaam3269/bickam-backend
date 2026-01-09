import AppSettings from '../models/AppSettings.js';
import { Op } from 'sequelize';

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
   * @returns {Promise<object|null>} App setting or null
   */
  async getSettingByName(name) {
    return await AppSettings.findOne({
      where: { name }
    });
  }

  /**
   * Get main app settings (default: 'app_main')
   * @returns {Promise<object|null>} Main app settings or null
   */
  async getMainSettings() {
    return await this.getSettingByName('app_main');
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

