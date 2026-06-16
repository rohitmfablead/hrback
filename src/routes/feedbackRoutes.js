import express from 'express';
import { getFeedback, createFeedback, updateFeedback, deleteFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

router.get('/', getFeedback);
router.post('/', createFeedback);
router.put('/:id', updateFeedback);
router.delete('/:id', deleteFeedback);

export default router;
