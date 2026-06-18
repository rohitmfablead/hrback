import express from 'express';
import { getFeedback, createFeedback, updateFeedback, deleteFeedback } from '../controllers/feedbackController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/', getFeedback);
router.post('/', createFeedback);
router.put('/:id', authorize('Admin', 'HR'), updateFeedback);
router.delete('/:id', authorize('Admin'), deleteFeedback);

export default router;
