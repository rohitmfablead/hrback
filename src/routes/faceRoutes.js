import express from 'express';
import { registerFace, checkFaceRegistration, verifyFace } from '../controllers/faceController.js';
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

router.post('/verify',
  protect,
  upload.single('face'),
  verifyFace
);

export default router;
