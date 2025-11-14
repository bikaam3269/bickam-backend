import walletService from '../services/walletService.js';

export const getWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const wallet = await walletService.getWallet(userId);

    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    next(error);
  }
};

export const deposit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Valid deposit amount is required' }
      });
    }

    const result = await walletService.deposit(userId, amount);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Deposit amount must be greater than 0') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const withdraw = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Valid withdrawal amount is required' }
      });
    }

    const result = await walletService.withdraw(userId, amount);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Withdrawal amount must be greater than 0') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.message === 'Insufficient balance') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const addBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Valid amount is required' }
      });
    }

    const wallet = await walletService.addBalance(userId, amount);

    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    if (error.message === 'Amount must be greater than 0') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const getBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const balance = await walletService.getBalance(userId);

    res.json({
      success: true,
      data: { balance }
    });
  } catch (error) {
    next(error);
  }
};

