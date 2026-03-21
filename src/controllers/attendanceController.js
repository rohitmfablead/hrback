import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import { loadFaceModels, detectFaceAndGetEmbedding, findBestFaceMatch } from '../utils/faceRecognition.js';

export const getAttendanceRecords = async (req, res) => {
  try {
    const { employeeId, fromDate, toDate, status } = req.query;
    
    let attendance = db.findAll('attendance');

    // Apply filters based on user role
    if (req.user.role === 'Employee') {
      const employee = db.findOne('employees', e => e.email === req.user.email);
      if (employee) {
        attendance = attendance.filter(a => a.employeeId === employee.id);
      }
    } else if (employeeId) {
      attendance = attendance.filter(a => a.employeeId === employeeId);
    }

    if (fromDate) {
      attendance = attendance.filter(a => a.date >= fromDate);
    }

    if (toDate) {
      attendance = attendance.filter(a => a.date <= toDate);
    }

    if (status) {
      attendance = attendance.filter(a => a.status === status);
    }

    res.status(200).json({
      success: true,
      data: {
        attendance,
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

export const markAttendance = async (req, res) => {
  try {
    const { employeeId, checkIn, checkOut } = req.body;

    // Validation
    if (!employeeId || !checkIn) {
      const error = new Error('Employee ID and check-in time are required');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    // Employees can only mark their own attendance
    let targetEmployeeId = employeeId;
    if (req.user.role === 'Employee') {
      const employee = db.findOne('employees', e => e.email === req.user.email);
      if (!employee) {
        const error = new Error('Employee profile not found');
        error.code = 'NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }
      targetEmployeeId = employee.id;
      
      if (employeeId !== employee.id) {
        const error = new Error('You can only mark your own attendance');
        error.code = 'FORBIDDEN';
        error.statusCode = 403;
        throw error;
      }
    }

    // Check if attendance already marked for today
    const today = new Date().toISOString().split('T')[0];
    const existingAttendance = db.findOne('attendance', 
      a => a.employeeId === employeeId && a.date === today
    );

    if (existingAttendance) {
      const error = new Error('Attendance already marked for today');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    // Determine status based on check-in time
    const checkInHour = parseInt(checkIn.split(':')[0]);
    const status = checkInHour > 9 ? 'Late' : 'Present';

    const attendance = {
      id: uuidv4(),
      employeeId,
      employeeName: db.findById('employees', employeeId)?.name || '',
      date: today,
      checkIn,
      checkOut: checkOut || '',
      status,
      createdAt: new Date().toISOString(),
    };

    db.insert('attendance', attendance);

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance,
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

// New endpoint for face recognition check-in
export const checkInWithFace = async (req, res) => {
  try {
    console.log('📸 Check-in request received from user:', req.user.email);
    
    // Load face models if not already loaded
    await loadFaceModels();

    // Check if image was provided
    if (!req.file) {
      const error = new Error('No face image provided');
      error.code = 'BAD_REQUEST';
      error.statusCode = 400;
      throw error;
    }

    console.log('📷 Processing face image...');

    // Detect face and get embedding from the uploaded image
    const queryEmbedding = await detectFaceAndGetEmbedding(req.file.buffer);

    // Get all users with registered faces
    const usersWithFaces = await User.find({ 
      faceRegistered: true,
      faceEmbedding: { $exists: true, $ne: [] }
    });

    if (usersWithFaces.length === 0) {
      const error = new Error('No registered faces found. Please register your face first.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Create map of user embeddings
    const userEmbeddings = {};
    usersWithFaces.forEach(user => {
      userEmbeddings[user.id] = user.faceEmbedding;
    });

    // Find best match
    const matchResult = findBestFaceMatch(queryEmbedding, userEmbeddings, 0.5);

    if (!matchResult.isMatch || !matchResult.userId) {
      const error = new Error('Face not recognized. Please try again or register your face first.');
      error.code = 'FACE_NOT_RECOGNIZED';
      error.statusCode = 403;
      throw error;
    }

    // Find the matched user
    const matchedUser = await User.findOne({ id: matchResult.userId });
    if (!matchedUser) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    console.log(`✅ Face matched: ${matchedUser.name} (distance: ${matchResult.distance.toFixed(4)})`);

    // Find employee record
    const employee = await Employee.findOne({ email: matchedUser.email });
    if (!employee) {
      const error = new Error('Employee profile not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const checkInTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({ 
      employeeId: employee.id, 
      date: today 
    });

    if (existingAttendance) {
      const error = new Error('Already checked in today');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    // Determine status based on check-in time (after 9:30 AM is late)
    const checkInHour = now.getHours();
    const status = (checkInHour > 9 || (checkInHour === 9 && now.getMinutes() > 30)) ? 'Late' : 'Present';

    // Create attendance record
    const attendance = {
      id: uuidv4(),
      employeeId: employee.id,
      employeeName: employee.name,
      date: today,
      checkIn: checkInTime,
      checkOut: '',
      status,
      createdAt: new Date().toISOString(),
    };

    // Save to database
    await Attendance.create(attendance);

    console.log(`✅ Check-in successful for ${employee.name} at ${checkInTime}`);

    res.status(201).json({
      success: true,
      message: 'Check-in successful',
      data: {
        checkIn: checkInTime,
        status,
        ...attendance,
      },
    });
  } catch (error) {
    console.error('❌ Check-in error:', error);
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

// New endpoint for face recognition check-out
export const checkOutWithFace = async (req, res) => {
  try {
    console.log('📸 Check-out request received from user:', req.user.email);
    
    // Load face models if not already loaded
    await loadFaceModels();

    // Check if image was provided
    if (!req.file) {
      const error = new Error('No face image provided');
      error.code = 'BAD_REQUEST';
      error.statusCode = 400;
      throw error;
    }

    console.log('📷 Processing face image...');

    // Detect face and get embedding from the uploaded image
    const queryEmbedding = await detectFaceAndGetEmbedding(req.file.buffer);

    // Get all users with registered faces
    const usersWithFaces = await User.find({ 
      faceRegistered: true,
      faceEmbedding: { $exists: true, $ne: [] }
    });

    if (usersWithFaces.length === 0) {
      const error = new Error('No registered faces found. Please register your face first.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Create map of user embeddings
    const userEmbeddings = {};
    usersWithFaces.forEach(user => {
      userEmbeddings[user.id] = user.faceEmbedding;
    });

    // Find best match
    const matchResult = findBestFaceMatch(queryEmbedding, userEmbeddings, 0.5);

    if (!matchResult.isMatch || !matchResult.userId) {
      const error = new Error('Face not recognized. Please try again or register your face first.');
      error.code = 'FACE_NOT_RECOGNIZED';
      error.statusCode = 403;
      throw error;
    }

    // Find the matched user
    const matchedUser = await User.findOne({ id: matchResult.userId });
    if (!matchedUser) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    console.log(`✅ Face matched: ${matchedUser.name} (distance: ${matchResult.distance.toFixed(4)})`);

    // Find employee record
    const employee = await Employee.findOne({ email: matchedUser.email });
    if (!employee) {
      const error = new Error('Employee profile not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const checkOutTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    // Find today's attendance record
    const todayAttendance = await Attendance.findOne({ 
      employeeId: employee.id, 
      date: today 
    });

    if (!todayAttendance) {
      const error = new Error('No check-in found for today. Please check in first.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (todayAttendance.checkOut) {
      const error = new Error('Already checked out today');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    // Update attendance record with check-out time
    todayAttendance.checkOut = checkOutTime;
    await todayAttendance.save();

    console.log(`✅ Check-out successful for ${employee.name} at ${checkOutTime}`);

    res.status(200).json({
      success: true,
      message: 'Check-out successful',
      data: {
        checkOut: checkOutTime,
        ...todayAttendance.toObject(),
      },
    });
  } catch (error) {
    console.error('❌ Check-out error:', error);
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

export const getMyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const employee = db.findOne('employees', e => e.email === req.user.email);
    if (!employee) {
      const error = new Error('Employee profile not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    let attendance = db.findByQuery('attendance', a => a.employeeId === employee.id);

    // Filter by month and year if provided
    if (month || year) {
      const monthNum = month ? parseInt(month) : null;
      const yearNum = year ? parseInt(year) : new Date().getFullYear();

      attendance = attendance.filter(a => {
        const attendanceDate = new Date(a.date);
        if (monthNum !== null && attendanceDate.getMonth() + 1 !== monthNum) {
          return false;
        }
        if (yearNum && attendanceDate.getFullYear() !== yearNum) {
          return false;
        }
        return true;
      });
    }

    // Calculate summary
    const summary = {
      present: attendance.filter(a => a.status === 'Present').length,
      absent: attendance.filter(a => a.status === 'Absent').length,
      late: attendance.filter(a => a.status === 'Late').length,
      totalWorkingDays: attendance.length,
    };

    res.status(200).json({
      success: true,
      data: {
        attendance,
        summary,
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

export const getAttendanceStatistics = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let attendance = db.findAll('attendance');

    // Filter by month and year if provided
    if (month || year) {
      const monthNum = month ? parseInt(month) : null;
      const yearNum = year ? parseInt(year) : new Date().getFullYear();

      attendance = attendance.filter(a => {
        const attendanceDate = new Date(a.date);
        if (monthNum !== null && attendanceDate.getMonth() + 1 !== monthNum) {
          return false;
        }
        if (yearNum && attendanceDate.getFullYear() !== yearNum) {
          return false;
        }
        return true;
      });
    }

    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today);

    const employees = db.findAll('employees').filter(e => e.status === 'Active');

    const stats = {
      totalEmployees: employees.length,
      presentToday: todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length,
      absentToday: todayAttendance.filter(a => a.status === 'Absent').length,
      lateToday: todayAttendance.filter(a => a.status === 'Late').length,
      attendancePercentage: employees.length > 0 
        ? Math.round(((todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / employees.length) * 100))
        : 0,
      weeklyData: [],
    };

    // Generate weekly data (last 5 working days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayAttendance = attendance.filter(a => a.date === dateStr);
      
      stats.weeklyData.push({
        day: days[date.getDay()],
        present: dayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length,
        absent: dayAttendance.filter(a => a.status === 'Absent').length,
      });
    }

    res.status(200).json({
      success: true,
      data: stats,
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

export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const attendance = db.findById('attendance', id);
    if (!attendance) {
      const error = new Error('Attendance record not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const updatedAttendance = db.update('attendance', id, updateData);

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: updatedAttendance,
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
