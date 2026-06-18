import express from 'express';
import {
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  getCandidates,
  createCandidate,
  updateCandidateStatus,
  deleteCandidate
} from '../controllers/recruitmentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Require admin or HR access for all recruitment operations
router.use(protect);
router.use(authorize('Admin', 'HR'));

// Job Routes
router.route('/jobs')
  .get(getJobs)
  .post(createJob);

router.route('/jobs/:id')
  .put(updateJob)
  .delete(deleteJob);

// Candidate Routes
router.route('/candidates')
  .get(getCandidates)
  .post(createCandidate);

router.route('/candidates/:id')
  .put(updateCandidateStatus)
  .delete(deleteCandidate);

router.route('/candidates/:id/status')
  .put(updateCandidateStatus); // Alias for updating just the status

export default router;
