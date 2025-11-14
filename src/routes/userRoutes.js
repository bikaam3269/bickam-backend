import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
