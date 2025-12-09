import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

class WalletService {
  async getOrCreateWallet(userId) {
    let wallet = await Wallet.findOne({ where: { userId } });

    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0.00
      });
    }

    return wallet;
  }

  async getWallet(userId) {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet;
  }

  async addBalance(userId, amount, description = null, referenceId = null, referenceType = null) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = parseFloat(wallet.balance);
    const amountNum = parseFloat(amount);
    wallet.balance = balanceBefore + amountNum;
    await wallet.save();

    // Record transaction
    await WalletTransaction.create({
      userId,
      type: 'deposit',
      amount: amountNum,
      balanceBefore,
      balanceAfter: parseFloat(wallet.balance),
      description: description || `إيداع مبلغ ${amountNum} جنيه`,
      referenceId,
      referenceType
    });

    return wallet;
  }

  async deductBalance(userId, amount, description = null, referenceId = null, referenceType = null) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = parseFloat(wallet.balance);
    const deductAmount = parseFloat(amount);

    if (balanceBefore < deductAmount) {
      throw new Error('Insufficient balance');
    }

    wallet.balance = balanceBefore - deductAmount;
    await wallet.save();

    // Record transaction
    await WalletTransaction.create({
      userId,
      type: 'payment',
      amount: deductAmount,
      balanceBefore,
      balanceAfter: parseFloat(wallet.balance),
      description: description || `دفع مبلغ ${deductAmount} جنيه`,
      referenceId,
      referenceType
    });

    return wallet;
  }

  async deductBalancePartial(userId, amount, description = null, referenceId = null, referenceType = null) {
    if (amount <= 0) {
      return { deducted: 0, remaining: amount };
    }

    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = parseFloat(wallet.balance);
    const requestedAmount = parseFloat(amount);

    if (balanceBefore <= 0) {
      return { deducted: 0, remaining: requestedAmount };
    }

    const deducted = Math.min(balanceBefore, requestedAmount);
    const remaining = requestedAmount - deducted;

    wallet.balance = balanceBefore - deducted;
    await wallet.save();

    // Record transaction if any amount was deducted
    if (deducted > 0) {
      await WalletTransaction.create({
        userId,
        type: 'payment',
        amount: deducted,
        balanceBefore,
        balanceAfter: parseFloat(wallet.balance),
        description: description || `دفع جزئي مبلغ ${deducted} جنيه`,
        referenceId,
        referenceType
      });
    }

    return { deducted, remaining };
  }

  async getBalance(userId) {
    const wallet = await this.getOrCreateWallet(userId);
    return parseFloat(wallet.balance);
  }

  async deposit(userId, amount, description = null, referenceId = null, referenceType = null) {
    if (amount <= 0) {
      throw new Error('Deposit amount must be greater than 0');
    }

    const wallet = await this.addBalance(userId, amount, description || 'إيداع في المحفظة', referenceId, referenceType);

    return {
      message: 'Deposit successful',
      amount: parseFloat(amount),
      newBalance: parseFloat(wallet.balance)
    };
  }

  async withdraw(userId, amount, description = null, referenceId = null, referenceType = null) {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = parseFloat(wallet.balance);
    const withdrawAmount = parseFloat(amount);

    if (balanceBefore < withdrawAmount) {
      throw new Error('Insufficient balance');
    }

    wallet.balance = balanceBefore - withdrawAmount;
    await wallet.save();

    // Record transaction
    await WalletTransaction.create({
      userId,
      type: 'withdrawal',
      amount: withdrawAmount,
      balanceBefore,
      balanceAfter: parseFloat(wallet.balance),
      description: description || `سحب مبلغ ${withdrawAmount} جنيه`,
      referenceId,
      referenceType
    });

    return {
      message: 'Withdrawal successful',
      amount: withdrawAmount,
      newBalance: parseFloat(wallet.balance)
    };
  }

  async transferBalance(fromUserId, toUserId, amount, description = null) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const transferAmount = parseFloat(amount);

    // Deduct from sender
    await this.deductBalance(
      fromUserId, 
      transferAmount, 
      description || `تحويل مبلغ ${transferAmount} جنيه`,
      toUserId,
      'user'
    );

    // Add to receiver
    await this.addBalance(
      toUserId, 
      transferAmount, 
      description || `استلام مبلغ ${transferAmount} جنيه`,
      fromUserId,
      'user'
    );

    return {
      message: 'Transfer successful',
      amount: transferAmount
    };
  }

  /**
   * Get wallet transactions for a user
   * @param {number} userId - User ID
   * @param {object} options - Query options (type, limit, offset)
   * @returns {Promise<object>}
   */
  async getTransactions(userId, options = {}) {
    const {
      type = null,
      limit = 50,
      offset = 0
    } = options;

    const where = { userId };

    if (type) {
      where.type = type;
    }

    const { count, rows } = await WalletTransaction.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    return {
      transactions: rows,
      pagination: {
        total: count,
        page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
        hasMore: parseInt(offset) + rows.length < count
      }
    };
  }

  /**
   * Add refund transaction
   * @param {number} userId - User ID
   * @param {number} amount - Refund amount
   * @param {string} description - Transaction description
   * @param {number} referenceId - Reference ID (e.g., order_id)
   * @param {string} referenceType - Reference type (e.g., 'order')
   * @returns {Promise<object>}
   */
  async addRefund(userId, amount, description = null, referenceId = null, referenceType = null) {
    if (amount <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }

    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = parseFloat(wallet.balance);
    const refundAmount = parseFloat(amount);
    wallet.balance = balanceBefore + refundAmount;
    await wallet.save();

    // Record transaction
    await WalletTransaction.create({
      userId,
      type: 'refund',
      amount: refundAmount,
      balanceBefore,
      balanceAfter: parseFloat(wallet.balance),
      description: description || `استرداد مبلغ ${refundAmount} جنيه`,
      referenceId,
      referenceType
    });

    return wallet;
  }
}

export default new WalletService();

