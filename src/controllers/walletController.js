import walletService from '../services/walletService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const wallet = await walletService.getWallet(userId);

    return sendSuccess(res, wallet, 'Wallet retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const deposit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return sendError(res, 'Valid deposit amount is required', 400);
    }

    const result = await walletService.deposit(userId, amount);

    return sendSuccess(res, result, 'Deposit successful');
  } catch (error) {
    if (error.message === 'Deposit amount must be greater than 0') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const withdraw = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return sendError(res, 'Valid withdrawal amount is required', 400);
    }

    const result = await walletService.withdraw(userId, amount);

    return sendSuccess(res, result, 'Withdrawal successful');
  } catch (error) {
    if (error.message === 'Withdrawal amount must be greater than 0' ||
        error.message === 'Insufficient balance') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const addBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return sendError(res, 'Valid amount is required', 400);
    }

    const wallet = await walletService.addBalance(userId, amount);

    return sendSuccess(res, wallet, 'Balance added successfully');
  } catch (error) {
    if (error.message === 'Amount must be greater than 0') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const balance = await walletService.getBalance(userId);

    return sendSuccess(res, { balance }, 'Balance retrieved successfully');
  } catch (error) {
    next(error);
  }
};

