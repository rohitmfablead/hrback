import express from 'express';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../controllers/holidayController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getHolidays);
router.post('/', authorize('Admin', 'HR'), createHoliday);
router.put('/:id', authorize('Admin', 'HR'), updateHoliday);
router.delete('/:id', authorize('Admin', 'HR'), deleteHoliday);

export default router;
