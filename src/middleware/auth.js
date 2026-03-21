import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import db from '../config/database.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
        },
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    console.log('🔐 Decoded JWT:', decoded);
    
    // Find user by ID (try both custom id and _id)
    let user = await db.findUserById(decoded.id);
    
    // If not found by custom id, try _id (ObjectId)
    if (!user && decoded.id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await db.models.User.findById(decoded.id);
    }
    
    console.log('👤 Found user:', user ? { id: user.id, email: user.email, role: user.role } : null);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }
    next();
  };
};
