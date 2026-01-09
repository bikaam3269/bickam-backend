import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  exportUsers
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

router.get('/export', exportUsers);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', upload.single('image'), updateUser);
router.delete('/:id', deleteUser);

export default router;
