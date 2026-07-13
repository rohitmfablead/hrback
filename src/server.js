import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import http from 'http';
import { Server } from 'socket.io';
import Message from './models/Message.js';
import Conversation from './models/Conversation.js';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import connectDB from './config/mongodb.js';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS middleware - Allow multiple origins for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allowed origins - allow any localhost origin
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:5173',
      'http://localhost:5000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));



// app.use('/api', limiter);

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const employeeUploadsDir = path.join(uploadsDir, 'employees');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

if (!fs.existsSync(employeeUploadsDir)) {
  fs.mkdirSync(employeeUploadsDir, { recursive: true });
  console.log('📁 Created employee uploads directory:', employeeUploadsDir);
}

// NOTE: Removed redundant server-level upload middleware. Individual routes now handle multipart uploads using the shared upload middleware (src/middleware/upload.js).

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve('uploads')));
// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Compression middleware
app.use(compression());

// API Routes
app.use('/api', routes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Test API is working perfectly!',
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Initialize database and start server
const initializeServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create admin user if not exists
    const adminExists = await User.findOne({ $or: [{ email: config.adminEmail }, { id: 'admin-001' }] });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(config.adminPassword, 10);
      await User.create({
        id: 'admin-001',
        name: 'Admin User',
        email: config.adminEmail,
        password: hashedPassword,
        role: 'Admin',
        avatar: 'AU',
      });
      console.log('✓ Admin user created');
    }

    // Start server with Socket.IO
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    });
    app.set('io', io);

    io.on('connection', (socket) => {
      console.log('User connected to socket:', socket.id);
      
      socket.on('join', (userId) => {
        socket.join(userId); // Users join a room with their own userId
        console.log(`User ${userId} joined their personal room`);
      });

      socket.on('send_message', async (data) => {
        try {
          const { senderId, receiverId, text, imageUrl } = data;
          
          let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
          });

          if (!conversation) {
            conversation = await Conversation.create({
              participants: [senderId, receiverId]
            });
          }

          const newMessage = await Message.create({
            conversationId: conversation._id,
            sender: senderId,
            text,
            imageUrl
          });

          conversation.lastMessage = newMessage._id;
          await conversation.save();

          // Emit to receiver's personal room
          io.to(receiverId).emit('receive_message', newMessage);
          // Emit to sender so their UI updates immediately too (if needed)
          io.to(senderId).emit('receive_message', newMessage);
          
        } catch (error) {
          console.error('Socket send_message error:', error);
        }
      });

      socket.on('typing', (data) => {
        const { senderId, receiverId } = data;
        io.to(receiverId).emit('user_typing', { senderId });
      });

      socket.on('stop_typing', (data) => {
        const { senderId, receiverId } = data;
        io.to(receiverId).emit('user_stop_typing', { senderId });
      });

      socket.on('mark_read', async (data) => {
        try {
          const { senderId, receiverId } = data; // receiverId is the one who sent the messages originally
          
          let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
          });

          if (conversation) {
            await Message.updateMany(
              { conversationId: conversation._id, sender: receiverId, read: false },
              { $set: { read: true } }
            );
            
            // Notify the original sender that their messages were read
            io.to(receiverId).emit('messages_read', { 
              readerId: senderId,
              conversationId: conversation._id 
            });
          }
        } catch (error) {
          console.error('Socket mark_read error:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    server.listen(config.port, () => {
      console.log(`✓ Server running in ${config.nodeEnv} mode on port ${config.port}`);
    });

    // Start background jobs
    import('./utils/cron.js').then(module => {
      module.default();
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

initializeServer();

export default app;
