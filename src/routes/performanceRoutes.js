import express from 'express';
import { getPerformances, createPerformance, updatePerformance, deletePerformance } from '../controllers/performanceController.js';

const router = express.Router();

router.get('/', getPerformances);
router.post('/', createPerformance);
router.put('/:id', updatePerformance);
router.delete('/:id', deletePerformance);

export default router;
