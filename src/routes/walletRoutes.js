import express from 'express';
import {
  getWallet,
  deposit,
  withdraw,
  addBalance,
  getBalance,
  getTransactions
} from '../controllers/walletController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All wallet routes require authentication
router.use(authenticate);

router.get('/', getWallet);
router.get('/balance', getBalance);
router.get('/transactions', getTransactions);
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);
router.post('/add', addBalance); // Keep for backward compatibility

export default router;

