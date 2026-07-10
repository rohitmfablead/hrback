import express from 'express';
import { getConversations, getMessages, getUsersForChat, uploadChatImage } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.get('/conversations', getConversations);
router.get('/messages/:userId', getMessages);
router.get('/users', getUsersForChat);
router.post('/upload-image', upload.single('image'), uploadChatImage);

export default router;
