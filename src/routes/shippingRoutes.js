import express from 'express';
import {
  getAllShippings,
  getShippingById,
  getShippingPrice,
  createShipping,
  updateShipping,
  deleteShipping
} from '../controllers/shippingController.js';

const router = express.Router();

// Get shipping price by route (must be before /:id route)
router.get('/price', getShippingPrice);

// General routes
router.get('/', getAllShippings);
router.get('/:id', getShippingById);
router.post('/', createShipping);
router.put('/:id', updateShipping);
router.delete('/:id', deleteShipping);

export default router;

