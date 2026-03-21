import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

export const getNotifications = async (req, res) => {
  try {
    const { unreadOnly, type, limit = 20 } = req.query;
    
    let notifications = db.findAll('notifications');

    // Filter by user (you can add userId to notifications if needed)
    // For now, return all notifications (can be filtered by role)

    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.isRead);
    }

    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }

    // Limit results
    notifications = notifications.slice(0, parseInt(limit));

    // Count unread
    const unreadCount = db.findAll('notifications').filter(n => !n.isRead).length;

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    throw error;
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = db.findById('notifications', id);
    if (!notification) {
      const error = new Error('Notification not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    db.update('notifications', id, { isRead: true });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    throw error;
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const notifications = db.findAll('notifications');
    
    notifications.forEach(notification => {
      db.update('notifications', notification.id, { isRead: true });
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    throw error;
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = db.findById('notifications', id);
    if (!notification) {
      const error = new Error('Notification not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    db.delete('notifications', id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    throw error;
  }
};

export const clearAllNotifications = async (req, res) => {
  try {
    // Clear all notifications by resetting the array
    db.data.notifications = [];

    res.status(200).json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    throw error;
  }
};

export const createNotification = async (req, res) => {
  try {
    const { title, message, type = 'info', userId } = req.body;

    // Validation
    if (!title || !message) {
      const error = new Error('Title and message are required');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    const notification = {
      id: uuidv4(),
      title,
      message,
      type,
      userId: userId || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    db.insert('notifications', notification);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification,
    });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    throw error;
  }
};
