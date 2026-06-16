import express from 'express';
import { getRules, createRule, updateRule, deleteRule } from '../controllers/ruleController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getRules);
router.post('/', authorize('Admin', 'HR'), createRule);
router.put('/:id', authorize('Admin', 'HR'), updateRule);
router.delete('/:id', authorize('Admin', 'HR'), deleteRule);

export default router;
