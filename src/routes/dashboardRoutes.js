import express from 'express';
import {
  getDashboardStatistics,
  getChartData,
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', protect, getDashboardStatistics);
router.get('/charts', protect, getChartData);

export default router;
