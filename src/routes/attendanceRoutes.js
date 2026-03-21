import express from 'express';
import {
  getAttendanceRecords,
  markAttendance,
  getMyAttendance,
  getAttendanceStatistics,
  updateAttendance,
  checkInWithFace,
  checkOutWithFace,
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Face recognition attendance endpoints
router.post('/face/check-in', protect, checkInWithFace);
router.post('/face/check-out', protect, checkOutWithFace);

// Statistics and overview
router.get('/stats', protect, getAttendanceStatistics);

// Employee-specific endpoints
router.get('/my', protect, getMyAttendance);

// Mark attendance (regular)
router.post('/mark', protect, markAttendance);

// Get all attendance (Admin/HR with filters)
router.get('/', protect, getAttendanceRecords);

// Update attendance (Admin/HR only)
router.put('/:id', protect, authorize('Admin', 'HR'), updateAttendance);

export default router;
