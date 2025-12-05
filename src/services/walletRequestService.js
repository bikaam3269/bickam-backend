import WalletRequest from '../models/WalletRequest.js';
import User from '../models/User.js';
import walletService from './walletService.js';
import notificationService from './notificationService.js';
import { Op } from 'sequelize';

class WalletRequestService {
  /**
   * Create deposit request
   * @param {number} userId - User ID
   * @param {number} amount - Deposit amount
   * @param {string} evidenceImage - Evidence image filename
   * @returns {Promise<object>}
   */
  async createDepositRequest(userId, amount, evidenceImage) {
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!evidenceImage) {
      throw new Error('Evidence image is required for deposit');
    }

    const request = await WalletRequest.create({
      userId,
      type: 'deposit',
      amount: parseFloat(amount),
      evidenceImage,
      status: 'pending'
    });

    // Get request with user info
    const requestWithUser = await WalletRequest.findByPk(request.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      }]
    });

    return requestWithUser;
  }

  /**
   * Create withdrawal request
   * @param {number} userId - User ID
   * @param {number} amount - Withdrawal amount
   * @param {string} walletNumber - Wallet number (phone, bank account, etc.)
   * @returns {Promise<object>}
   */
  async createWithdrawalRequest(userId, amount, walletNumber) {
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!walletNumber) {
      throw new Error('Wallet number is required for withdrawal');
    }

    // Check if user has sufficient balance
    const balance = await walletService.getBalance(userId);
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }

    const request = await WalletRequest.create({
      userId,
      type: 'withdrawal',
      amount: parseFloat(amount),
      walletNumber,
      status: 'pending'
    });

    // Get request with user info
    const requestWithUser = await WalletRequest.findByPk(request.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone']
      }]
    });

    return requestWithUser;
  }

  /**
   * Get user's wallet requests
   * @param {number} userId - User ID
   * @param {string} type - Optional: 'deposit' or 'withdrawal'
   * @param {string} status - Optional: 'pending', 'approved', 'rejected'
   * @returns {Promise<Array>}
   */
  async getUserRequests(userId, type = null, status = null) {
    const where = { userId };
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.status = status;
    }

    const requests = await WalletRequest.findAll({
      where,
      include: [{
        model: User,
        as: 'admin',
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

    return requests;
  }

  /**
   * Get all wallet requests (for admin)
   * @param {object} filters - Filters (type, status, page, limit)
   * @returns {Promise<object>}
   */
  async getAllRequests(filters = {}) {
    const { type, status, page = 1, limit = 10 } = filters;
    const where = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await WalletRequest.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      requests: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get wallet request by ID
   * @param {number} id - Request ID
   * @returns {Promise<object>}
   */
  async getRequestById(id) {
    const request = await WalletRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!request) {
      throw new Error('Wallet request not found');
    }

    return request;
  }

  /**
   * Approve deposit request (admin only)
   * @param {number} requestId - Request ID
   * @param {number} adminId - Admin ID
   * @returns {Promise<object>}
   */
  async approveDepositRequest(requestId, adminId) {
    const request = await WalletRequest.findByPk(requestId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'fcmToken']
      }]
    });

    if (!request) {
      throw new Error('Wallet request not found');
    }

    if (request.type !== 'deposit') {
      throw new Error('This is not a deposit request');
    }

    if (request.status !== 'pending') {
      throw new Error(`Request is already ${request.status}`);
    }

    // Add balance to user's wallet
    await walletService.addBalance(request.userId, request.amount);

    // Update request status
    request.status = 'approved';
    request.adminId = adminId;
    await request.save();

    // Send notification to user
    try {
      const user = request.user;
      await notificationService.sendNotificationToUser(
        request.userId,
        'تم قبول طلب الإيداع',
        `تم قبول طلب إيداعك بمبلغ ${request.amount} جنيه. تم إضافة المبلغ إلى محفظتك.`,
        {
          type: 'wallet_deposit_approved',
          requestId: request.id,
          amount: parseFloat(request.amount)
        }
      );
    } catch (error) {
      console.error('Failed to send deposit approval notification:', error);
    }

    return request;
  }

  /**
   * Approve withdrawal request (admin only)
   * @param {number} requestId - Request ID
   * @param {number} adminId - Admin ID
   * @param {string} evidenceImage - Evidence image filename (proof of transfer)
   * @returns {Promise<object>}
   */
  async approveWithdrawalRequest(requestId, adminId, evidenceImage) {
    const request = await WalletRequest.findByPk(requestId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'fcmToken']
      }]
    });

    if (!request) {
      throw new Error('Wallet request not found');
    }

    if (request.type !== 'withdrawal') {
      throw new Error('This is not a withdrawal request');
    }

    if (request.status !== 'pending') {
      throw new Error(`Request is already ${request.status}`);
    }

    if (!evidenceImage) {
      throw new Error('Evidence image is required for withdrawal approval');
    }

    // Check if user still has sufficient balance
    const balance = await walletService.getBalance(request.userId);
    if (balance < request.amount) {
      throw new Error('User has insufficient balance');
    }

    // Deduct balance from user's wallet
    await walletService.deductBalance(request.userId, request.amount);

    // Update request status
    request.status = 'approved';
    request.adminId = adminId;
    request.evidenceImage = evidenceImage;
    await request.save();

    // Send notification to user
    try {
      await notificationService.sendNotificationToUser(
        request.userId,
        'تم قبول طلب السحب',
        `تم قبول طلب سحبك بمبلغ ${request.amount} جنيه. تم خصم المبلغ من محفظتك.`,
        {
          type: 'wallet_withdrawal_approved',
          requestId: request.id,
          amount: parseFloat(request.amount),
          evidenceImage: evidenceImage
        }
      );
    } catch (error) {
      console.error('Failed to send withdrawal approval notification:', error);
    }

    return request;
  }

  /**
   * Reject wallet request (admin only)
   * @param {number} requestId - Request ID
   * @param {number} adminId - Admin ID
   * @param {string} rejectionReason - Reason for rejection
   * @returns {Promise<object>}
   */
  async rejectRequest(requestId, adminId, rejectionReason = null) {
    const request = await WalletRequest.findByPk(requestId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'fcmToken']
      }]
    });

    if (!request) {
      throw new Error('Wallet request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Request is already ${request.status}`);
    }

    // Update request status
    request.status = 'rejected';
    request.adminId = adminId;
    request.rejectionReason = rejectionReason;
    await request.save();

    // Send notification to user
    try {
      const typeText = request.type === 'deposit' ? 'إيداع' : 'سحب';
      await notificationService.sendNotificationToUser(
        request.userId,
        `تم رفض طلب ${typeText}`,
        `تم رفض طلب ${typeText}ك بمبلغ ${request.amount} جنيه.${rejectionReason ? ' السبب: ' + rejectionReason : ''}`,
        {
          type: `wallet_${request.type}_rejected`,
          requestId: request.id,
          amount: parseFloat(request.amount),
          rejectionReason: rejectionReason
        }
      );
    } catch (error) {
      console.error('Failed to send rejection notification:', error);
    }

    return request;
  }
}

export default new WalletRequestService();

