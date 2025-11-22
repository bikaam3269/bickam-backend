import express from 'express';
import { 
  register, 
  login, 
  getProfile, 
  changePassword,
  verifyCode,
  resendVerificationCode,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Register route with file upload support for vendor logoImage and backgroundImage
router.post('/register', upload.fields([
  { name: 'logoImage', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 }
]), register);
router.post('/login', login);
router.post('/verify', verifyCode);
router.post('/resend-verification', resendVerificationCode);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', authenticate, getProfile);
router.post('/change-password', authenticate, changePassword);

export default router;


