import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

// @desc    Get all conversations for the logged in user
// @route   GET /api/chat/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'name email role avatar profilePicture')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean();

    // Attach unread count for each conversation
    for (let i = 0; i < conversations.length; i++) {
      const unreadCount = await Message.countDocuments({
        conversationId: conversations[i]._id,
        sender: { $ne: userId },
        read: false
      });
      conversations[i].unreadCount = unreadCount;
    }

    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
};

// @desc    Get messages for a specific conversation
// @route   GET /api/chat/messages/:userId (userId of the person we are chatting with)
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user._id;

    // Find the conversation between the two users
    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId] }
    });

    if (!conversation) {
      return res.status(200).json({ success: true, data: [] });
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
    
    // Mark messages as read
    await Message.updateMany(
      { conversationId: conversation._id, sender: otherUserId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
};

// @desc    Get users for new chat
// @route   GET /api/chat/users
// @access  Private
export const getUsersForChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let query = { _id: { $ne: userId } };

    if (userRole === 'Employee') {
      query.role = { $in: ['Admin', 'HR'] };
    } else if (userRole === 'HR') {
      query.role = { $in: ['Admin', 'Employee', 'HR'] };
    }

    // Get all active users based on role restrictions
    const users = await User.find(query)
      .select('name email role avatar profilePicture')
      .sort({ name: 1 });
      
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching chat users:', error);
    res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
};

// @desc    Upload an image for chat
// @route   POST /api/chat/upload-image
// @access  Private
export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No image uploaded' } });
    }
    
    // Create image URL path
    const imageUrl = `/uploads/employees/${req.file.filename}`;
    
    res.status(200).json({ 
      success: true, 
      data: { imageUrl } 
    });
  } catch (error) {
    console.error('Error uploading chat image:', error);
    res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
};
