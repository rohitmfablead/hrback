import express from 'express';
import {
  getPayrollRecords,
  getMyPayslips,
  generatePayslip,
  markSalaryAsPaid,
  downloadPayslip,
} from '../controllers/payrollController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/my', protect, getMyPayslips);
router.get('/', protect, authorize('Admin', 'HR'), getPayrollRecords);
router.post('/generate', protect, authorize('Admin', 'HR'), generatePayslip);
router.put('/:id/pay', protect, authorize('Admin', 'HR'), markSalaryAsPaid);
router.get('/:id/slip', protect, downloadPayslip);

export default router;
