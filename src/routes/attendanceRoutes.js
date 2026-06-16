import express from 'express';
import {
  getAttendanceRecords,
  markAttendance,
  getMyAttendance,
  getAttendanceStatistics,
  updateAttendance,
  checkInWithFace,
  checkOutWithFace,
  directCheckIn,
  directCheckOut,
  getTodayStatus,
  getAttendanceCalendar,
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

import upload from '../middleware/upload.js';

// Face recognition attendance endpoints
router.post('/face/check-in', protect, upload.single('face'), checkInWithFace);
router.post('/face/check-out', protect, upload.single('face'), checkOutWithFace);

// Direct checkout endpoint
router.post('/checkin', protect, directCheckIn);
router.post('/checkout', protect, directCheckOut);

// Statistics and overview
router.get('/stats', protect, getAttendanceStatistics);

// Employee-specific endpoints
router.get('/today-status', protect, getTodayStatus);
router.get('/my', protect, getMyAttendance);

// Mark attendance (regular)
router.post('/mark', protect, markAttendance);

// Get all attendance (Admin/HR with filters)
router.get('/', protect, getAttendanceRecords);

// Update attendance (Admin/HR only)
router.put('/:id', protect, authorize('Admin', 'HR'), updateAttendance);

router.get('/calendar', protect, getAttendanceCalendar);
export default router;
