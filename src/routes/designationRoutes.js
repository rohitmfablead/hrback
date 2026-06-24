import express from 'express';
import {
  getDesignations,
  getDesignationById,
  getDesignationsByDepartment,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from '../controllers/designationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('Admin', 'HR'), getDesignations);
router.post('/', protect, authorize('Admin', 'HR'), createDesignation);
router.get('/department/:departmentId', protect, authorize('Admin', 'HR'), getDesignationsByDepartment);
router.get('/:id', protect, authorize('Admin', 'HR'), getDesignationById);
router.put('/:id', protect, authorize('Admin', 'HR'), updateDesignation);
router.delete('/:id', protect, authorize('Admin', 'HR'), deleteDesignation);

export default router;
