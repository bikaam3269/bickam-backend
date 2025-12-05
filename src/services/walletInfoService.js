import WalletInfo from '../models/WalletInfo.js';

class WalletInfoService {
  /**
   * Get all wallet info (with optional active filter)
   */
  async getAllWalletInfo(activeOnly = false) {
    const whereClause = activeOnly ? { isActive: true } : {};
    
    const walletInfos = await WalletInfo.findAll({
      where: whereClause,
      order: [['displayOrder', 'ASC'], ['createdAt', 'DESC']]
    });

    return walletInfos;
  }

  /**
   * Get wallet info by ID
   */
  async getWalletInfoById(id) {
    const walletInfo = await WalletInfo.findByPk(id);
    
    if (!walletInfo) {
      throw new Error('Wallet info not found');
    }

    return walletInfo;
  }

  /**
   * Create new wallet info
   */
  async createWalletInfo(data) {
    const { name, walletId, isActive = true, displayOrder = 0 } = data;

    if (!name || !walletId) {
      throw new Error('Name and wallet ID are required');
    }

    const walletInfo = await WalletInfo.create({
      name,
      walletId,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0
    });

    return walletInfo;
  }

  /**
   * Update wallet info
   */
  async updateWalletInfo(id, data) {
    const walletInfo = await this.getWalletInfoById(id);

    const { name, walletId, isActive, displayOrder } = data;

    if (name !== undefined) {
      walletInfo.name = name;
    }
    if (walletId !== undefined) {
      walletInfo.walletId = walletId;
    }
    if (isActive !== undefined) {
      walletInfo.isActive = isActive;
    }
    if (displayOrder !== undefined) {
      walletInfo.displayOrder = displayOrder;
    }

    await walletInfo.save();

    return walletInfo;
  }

  /**
   * Delete wallet info
   */
  async deleteWalletInfo(id) {
    const walletInfo = await this.getWalletInfoById(id);
    
    await walletInfo.destroy();

    return { message: 'Wallet info deleted successfully' };
  }
}

export default new WalletInfoService();

