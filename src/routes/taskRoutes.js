import express from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/taskController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getTasks)
  .post(protect, authorize('Admin', 'HR'), createTask);

router.route('/:id')
  .put(protect, updateTask)
  .delete(protect, authorize('Admin', 'HR'), deleteTask);

export default router;
