import walletRequestService from '../services/walletRequestService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

/**
 * Create deposit request
 * User uploads evidence image and amount
 */
export const createDepositRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get amount from form-data (req.body when using multer)
    const amount = req.body.amount ? parseFloat(req.body.amount) : null;

    if (!amount || isNaN(amount) || amount <= 0) {
      return sendError(res, 'Valid amount is required', 400);
    }

    // Handle file upload for evidence image (from form-data)
    let evidenceImage = null;
    if (req.file) {
      evidenceImage = `/files/${req.file.filename}`;
    }

    if (!evidenceImage) {
      return sendError(res, 'Evidence image is required for deposit', 400);
    }

    const request = await walletRequestService.createDepositRequest(
      userId,
      amount,
      evidenceImage
    );

    return sendSuccess(res, request, 'Deposit request created successfully. Waiting for admin approval.', 201);
  } catch (error) {
    if (error.message === 'Amount must be greater than 0' ||
        error.message === 'Evidence image is required for deposit') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Create withdrawal request
 * User provides amount and wallet number
 */
export const createWithdrawalRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, walletNumber } = req.body;

    if (!amount || amount <= 0) {
      return sendError(res, 'Valid amount is required', 400);
    }

    if (!walletNumber) {
      return sendError(res, 'Wallet number is required', 400);
    }

    const request = await walletRequestService.createWithdrawalRequest(
      userId,
      parseFloat(amount),
      walletNumber
    );

    return sendSuccess(res, request, 'Withdrawal request created successfully. Waiting for admin approval.', 201);
  } catch (error) {
    if (error.message === 'Amount must be greater than 0' ||
        error.message === 'Wallet number is required' ||
        error.message === 'Insufficient balance') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Get user's wallet requests
 */
export const getUserRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, status } = req.query;

    const requests = await walletRequestService.getUserRequests(userId, type, status);

    return sendSuccess(res, requests, 'Wallet requests retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all wallet requests (admin only)
 */
export const getAllRequests = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      status: req.query.status,
      page: req.query.page || 1,
      limit: req.query.limit || 10
    };

    const result = await walletRequestService.getAllRequests(filters);

    return sendSuccess(res, result, 'Wallet requests retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get wallet request by ID
 */
export const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    if (isNaN(requestId) || requestId <= 0) {
      return sendError(res, 'Invalid request ID', 400);
    }

    const request = await walletRequestService.getRequestById(requestId);

    return sendSuccess(res, request, 'Wallet request retrieved successfully');
  } catch (error) {
    if (error.message === 'Wallet request not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * Approve deposit request (admin only)
 */
export const approveDepositRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const requestId = parseInt(id);

    if (isNaN(requestId) || requestId <= 0) {
      return sendError(res, 'Invalid request ID', 400);
    }

    const request = await walletRequestService.approveDepositRequest(requestId, adminId);

    return sendSuccess(res, request, 'Deposit request approved successfully. Amount added to user wallet.');
  } catch (error) {
    if (error.message === 'Wallet request not found' ||
        error.message === 'This is not a deposit request' ||
        error.message.includes('already')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Approve withdrawal request (admin only)
 * Admin uploads evidence image
 */
export const approveWithdrawalRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const requestId = parseInt(id);

    if (isNaN(requestId) || requestId <= 0) {
      return sendError(res, 'Invalid request ID', 400);
    }

    // Handle file upload for evidence image
    let evidenceImage = null;
    if (req.file) {
      evidenceImage = `/files/${req.file.filename}`;
    }

    if (!evidenceImage) {
      return sendError(res, 'Evidence image is required for withdrawal approval', 400);
    }

    const request = await walletRequestService.approveWithdrawalRequest(
      requestId,
      adminId,
      evidenceImage
    );

    return sendSuccess(res, request, 'Withdrawal request approved successfully. Amount deducted from user wallet.');
  } catch (error) {
    if (error.message === 'Wallet request not found' ||
        error.message === 'This is not a withdrawal request' ||
        error.message === 'Evidence image is required for withdrawal approval' ||
        error.message === 'User has insufficient balance' ||
        error.message.includes('already')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * Reject wallet request (admin only)
 */
export const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { rejectionReason } = req.body;
    const requestId = parseInt(id);

    if (isNaN(requestId) || requestId <= 0) {
      return sendError(res, 'Invalid request ID', 400);
    }

    const request = await walletRequestService.rejectRequest(requestId, adminId, rejectionReason);

    return sendSuccess(res, request, 'Wallet request rejected successfully');
  } catch (error) {
    if (error.message === 'Wallet request not found' ||
        error.message.includes('already')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

