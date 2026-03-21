import express from 'express';
import { registerFace, checkFaceRegistration } from '../controllers/faceController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Face registration routes
router.post('/register', 
  protect, 
  upload.single('face'), 
  registerFace
);

router.get('/check-status', 
  protect, 
  checkFaceRegistration
);

export default router;
