import express from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getMyProfile,
} from '../controllers/employeeController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.get('/', protect, authorize('Admin', 'HR'), getAllEmployees);
router.post('/', protect, authorize('Admin', 'HR'), createEmployee);
router.get('/:id', protect, getEmployeeById);
router.put('/:id', protect, authorize('Admin', 'HR'), updateEmployee);
router.delete('/:id', protect, authorize('Admin'), deleteEmployee);

export default router;
