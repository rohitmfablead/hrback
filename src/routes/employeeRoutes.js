import express from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getMyProfile,
  updateMyProfile,
} from '../controllers/employeeController.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.put('/me', protect, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'faceRegistration', maxCount: 1 }]), updateMyProfile);
router.get('/', protect, authorize('Admin', 'HR'), getAllEmployees);
router.post('/', protect, authorize('Admin', 'HR'), upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'faceRegistration', maxCount: 1 }]), createEmployee);
router.get('/:id', protect, getEmployeeById);
router.put('/:id', protect, authorize('Admin', 'HR'), upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'faceRegistration', maxCount: 1 }]), updateEmployee);
router.delete('/:id', protect, authorize('Admin'), deleteEmployee);

export default router;
