import express from 'express';
import { login, getMe, logout, register, initializeAdmin } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/initialize-admin', initializeAdmin); // New endpoint to create admin
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
