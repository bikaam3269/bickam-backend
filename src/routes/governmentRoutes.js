import express from 'express';
import {
  getAllGovernments,
  getGovernmentById,
  getGovernmentByCode,
  createGovernment,
  updateGovernment,
  deleteGovernment
} from '../controllers/governmentController.js';

const router = express.Router();

router.get('/', getAllGovernments);
router.get('/code/:code', getGovernmentByCode);
router.get('/:id', getGovernmentById);
router.post('/', createGovernment);
router.put('/:id', updateGovernment);
router.delete('/:id', deleteGovernment);

export default router;

