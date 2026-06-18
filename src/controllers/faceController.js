import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { loadFaceModels, detectFaceAndGetEmbedding } from '../utils/faceRecognition.js';

// Register face for authenticated user
export const registerFace = async (req, res) => {
  try {
    console.log('📸 Face registration request from user:', req.user.email);

    // Ensure models are loaded
    await loadFaceModels();

    // Check if file was uploaded
    if (!req.file) {
      const error = new Error('No image provided. Please upload a clear photo of your face.');
      error.code = 'BAD_REQUEST';
      error.statusCode = 400;
      throw error;
    }

    console.log('📷 Image received:', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    // Detect face and get embedding
    const embedding = await detectFaceAndGetEmbedding(req.file);

    // Ensure we store a plain JavaScript array (MongoDB expects [] of Numbers)
    const embeddingArray = Array.isArray(embedding) ? embedding : Array.from(embedding);

    // Update User with face embedding
    const updatedUser = await User.findOneAndUpdate(
      { email: req.user.email },
      {
        faceEmbedding: embeddingArray,
        faceRegistered: true,
      },
      { new: true }
    );

    // Also update Employee faceRegistration subdocument
    const updatedEmployee = await Employee.findOneAndUpdate(
      { email: req.user.email },
      {
        $set: {
          'faceRegistration.isRegistered': true,
          'faceRegistration.faceEmbedding': embeddingArray,
          'faceRegistration.registeredAt': new Date()
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    console.log(`✅ Face registered successfully for ${updatedUser.name}`);

    res.status(200).json({
      success: true,
      message: 'Face registered successfully! You can now use face recognition for attendance.',
      data: {
        userId: updatedUser.id,
        name: updatedUser.name,
        faceRegistered: updatedUser.faceRegistered,
      },
    });
  } catch (error) {
    console.error('❌ Face registration error:', error);
    
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to register face. Please try again.',
      },
    });
  }
};

// Check if user has registered their face
export const checkFaceRegistration = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    
    if (!user) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: {
        faceRegistered: user.faceRegistered || false,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('❌ Check registration error:', error);
    
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

// Verify a face match against all registered users
export const verifyFace = async (req, res) => {
  try {
    console.log('📸 Face verification request received');
    
    // Ensure face models are loaded
    const modelsOk = await loadFaceModels();
    if (!modelsOk) {
      const err = new Error('Face recognition models could not be loaded');
      err.code = 'SERVER_ERROR';
      err.statusCode = 500;
      throw err;
    }

    if (!req.file) {
      const error = new Error('No face image provided');
      error.code = 'BAD_REQUEST';
      error.statusCode = 400;
      throw error;
    }

    // Detect face and get embedding
    const queryEmbedding = await detectFaceAndGetEmbedding(req.file);

    // Get all employees who have a registered face
    const employeesWithFaces = await Employee.find({
      'faceRegistration.isRegistered': true
    });

    if (!employeesWithFaces || employeesWithFaces.length === 0) {
      const error = new Error('No faces have been registered in the system yet.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Build a map of employeeId -> embedding for matching
    const userEmbeddings = {};
    employeesWithFaces.forEach(e => {
      userEmbeddings[e.id] = e.faceRegistration.faceEmbedding;
    });

    // Find best match (uses faceRecognition.js util)
    const { findBestFaceMatch } = await import('../utils/faceRecognition.js');
    const matchResult = findBestFaceMatch(queryEmbedding, userEmbeddings, 0.5);

    if (!matchResult.isMatch || !matchResult.userId) {
      return res.status(200).json({
        success: true,
        data: {
          isMatch: false,
          distance: matchResult.distance,
          message: 'Face not recognized'
        }
      });
    }

    // Find the matched employee
    const matchedEmployee = await Employee.findOne({ id: matchResult.userId });
    
    // Convert distance to a percentage (roughly)
    const matchPercentage = Math.max(0, Math.min(100, Math.round((1 - matchResult.distance) * 100)));

    res.status(200).json({
      success: true,
      data: {
        isMatch: true,
        distance: matchResult.distance,
        matchPercentage,
        userId: matchedEmployee.id,
        name: matchedEmployee.firstName + ' ' + matchedEmployee.lastName,
      }
    });

  } catch (error) {
    console.error('❌ Face verification error:', error);
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to verify face',
      },
    });
  }
};
