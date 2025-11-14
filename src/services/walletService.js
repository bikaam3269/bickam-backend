import Wallet from '../models/Wallet.js';
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

  async addBalance(userId, amount) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const wallet = await this.getOrCreateWallet(userId);
    wallet.balance = parseFloat(wallet.balance) + parseFloat(amount);
    await wallet.save();

    return wallet;
  }

  async deductBalance(userId, amount) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const wallet = await this.getOrCreateWallet(userId);
    const currentBalance = parseFloat(wallet.balance);
    const deductAmount = parseFloat(amount);

    if (currentBalance < deductAmount) {
      throw new Error('Insufficient balance');
    }

    wallet.balance = currentBalance - deductAmount;
    await wallet.save();

    return wallet;
  }

  async getBalance(userId) {
    const wallet = await this.getOrCreateWallet(userId);
    return parseFloat(wallet.balance);
  }

  async deposit(userId, amount) {
    if (amount <= 0) {
      throw new Error('Deposit amount must be greater than 0');
    }

    const wallet = await this.addBalance(userId, amount);

    return {
      message: 'Deposit successful',
      amount: parseFloat(amount),
      newBalance: parseFloat(wallet.balance)
    };
  }

  async withdraw(userId, amount) {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    const wallet = await this.deductBalance(userId, amount);

    return {
      message: 'Withdrawal successful',
      amount: parseFloat(amount),
      newBalance: parseFloat(wallet.balance)
    };
  }

  async transferBalance(fromUserId, toUserId, amount) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Deduct from sender
    await this.deductBalance(fromUserId, amount);

    // Add to receiver
    await this.addBalance(toUserId, amount);

    return {
      message: 'Transfer successful',
      amount
    };
  }
}

export default new WalletService();

