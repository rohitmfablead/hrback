import express from 'express';
import {
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType
} from '../controllers/leaveTypeController.js';

const router = express.Router();

router.route('/')
  .get(getLeaveTypes)
  .post(createLeaveType);

router.route('/:id')
  .put(updateLeaveType)
  .delete(deleteLeaveType);

export default router;
