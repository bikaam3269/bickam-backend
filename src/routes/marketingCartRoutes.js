import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/marketingCartController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and marketer authorization
router.use(authenticate);
router.use((req, res, next) => {
  if (req.user.type !== 'marketing') {
    return res.status(403).json({
      success: false,
      error: { message: 'Only marketers can access marketing cart' }
    });
  }
  next();
});

router.get('/', getCart);
router.post('/', addToCart);
router.put('/:id', updateCartItem);
router.delete('/clear', clearCart); // Changed to /clear to avoid conflict with /:id
router.delete('/:id', removeFromCart);

export default router;

