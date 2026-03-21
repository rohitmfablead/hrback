import express from 'express';
import {
  getAllLeaveRequests,
  applyForLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveBalance,
} from '../controllers/leaveController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/balance', protect, getLeaveBalance);
router.get('/', protect, getAllLeaveRequests);
router.post('/apply', protect, applyForLeave);
router.put('/:id/approve', protect, authorize('Admin', 'HR'), approveLeave);
router.put('/:id/reject', protect, authorize('Admin', 'HR'), rejectLeave);
router.delete('/:id', protect, cancelLeave);

export default router;
