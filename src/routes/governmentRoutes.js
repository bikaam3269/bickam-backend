import express from 'express';
import {
  getAllGovernments,
  getAllGovernmentsWithCities,
  getGovernmentById,
  createGovernment,
  updateGovernment,
  deleteGovernment
} from '../controllers/governmentController.js';

const router = express.Router();

router.get('/with-cities', getAllGovernmentsWithCities);
router.get('/', getAllGovernments);
router.get('/:id', getGovernmentById);
router.post('/', createGovernment);
router.put('/:id', updateGovernment);
router.delete('/:id', deleteGovernment);

export default router;

