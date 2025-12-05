import express from 'express';
import {
  getAllCities,
  getCityById,
  getCitiesByGovernmentId,
  createCity,
  updateCity,
  deleteCity
} from '../controllers/cityController.js';

const router = express.Router();

// Get cities by government ID (must be before /:id route)
router.get('/government/:governmentId', getCitiesByGovernmentId);

// General routes
router.get('/', getAllCities);
router.get('/:id', getCityById);
router.post('/', createCity);
router.put('/:id', updateCity);
router.delete('/:id', deleteCity);

export default router;

