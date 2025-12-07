import MarketplaceSettings from '../models/MarketplaceSettings.js';

class MarketplaceSettingsService {
  /**
   * Get setting by key
   */
  async getSetting(key, defaultValue = null) {
    const setting = await MarketplaceSettings.findOne({
      where: { key }
    });

    if (!setting) {
      // Create default setting if not exists
      if (defaultValue !== null) {
        return await this.setSetting(key, defaultValue);
      }
      return null;
    }

    // Try to parse JSON value, if fails return as string
    try {
      return JSON.parse(setting.value);
    } catch (e) {
      return setting.value;
    }
  }

  /**
   * Set setting value
   */
  async setSetting(key, value, description = null) {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    const [setting, created] = await MarketplaceSettings.findOrCreate({
      where: { key },
      defaults: {
        key,
        value: stringValue,
        description
      }
    });

    if (!created) {
      setting.value = stringValue;
      if (description !== null) {
        setting.description = description;
      }
      await setting.save();
    }

    // Return parsed value
    try {
      return JSON.parse(setting.value);
    } catch (e) {
      return setting.value;
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    const settings = await MarketplaceSettings.findAll({
      order: [['key', 'ASC']]
    });

    const result = {};
    for (const setting of settings) {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch (e) {
        result[setting.key] = setting.value;
      }
    }

    return result;
  }

  /**
   * Get default expiration days
   */
  async getDefaultExpirationDays() {
    const days = await this.getSetting('default_expiration_days', 10);
    return parseInt(days) || 10;
  }

  /**
   * Set default expiration days
   */
  async setDefaultExpirationDays(days) {
    const daysInt = parseInt(days);
    if (daysInt <= 0) {
      throw new Error('Expiration days must be a positive number');
    }
    return await this.setSetting(
      'default_expiration_days',
      daysInt,
      'عدد الأيام الافتراضي لانتهاء المنتجات المستعملة بعد الموافقة عليها'
    );
  }
}

export default new MarketplaceSettingsService();

