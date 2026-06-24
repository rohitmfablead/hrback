import express from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('Admin', 'HR'), getDepartments);
router.post('/', protect, authorize('Admin', 'HR'), createDepartment);
router.get('/:id', protect, authorize('Admin', 'HR'), getDepartmentById);
router.put('/:id', protect, authorize('Admin', 'HR'), updateDepartment);
router.delete('/:id', protect, authorize('Admin', 'HR'), deleteDepartment);

export default router;
