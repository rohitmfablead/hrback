import express from 'express';
import { getComplaints, createComplaint, updateComplaint, deleteComplaint } from '../controllers/complaintController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/', getComplaints);
router.post('/', createComplaint);
router.put('/:id', authorize('Admin', 'HR'), updateComplaint);
router.delete('/:id', authorize('Admin'), deleteComplaint);

export default router;
