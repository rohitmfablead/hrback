import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import Employee from '../models/Employee.js';

export const getAttendanceRecords = async (req, res) => {
  try {
    const { employeeId, fromDate, toDate, status } = req.query;
    
    const query = {};
    
    // Apply filters based on user role
    if (req.user.role === 'Employee') {
      const employee = await db.findEmployeeByEmail(req.user.email);
      if (employee) {
        query.employeeId = employee.id;
      }
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (fromDate) {
      query.date = query.date || {};
      query.date.$gte = new Date(fromDate);
    }

    if (toDate) {
      query.date = query.date || {};
      query.date.$lte = new Date(toDate);
    }

    if (status) {
      query.status = status;
    }

    const attendance = await db.findAllAttendance(query);

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
    const { employeeId, checkIn, checkOut, faceImage } = req.body;

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
      const employee = await db.findEmployeeByEmail(req.user.email);
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
    const today = new Date().setHours(0, 0, 0, 0);
    const existingAttendance = await db.findAllAttendance({
      employeeId,
      date: { $gte: new Date(today), $lt: new Date(today + 86400000) }
    });

    if (existingAttendance.length > 0) {
      const error = new Error('Attendance already marked for today');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    // Determine status based on check-in time
    const checkInHour = parseInt(checkIn.split(':')[0]);
    const status = checkInHour > 9 ? 'Late' : 'Present';

    const employee = await db.findEmployeeById(employeeId);

    // Prepare attendance data
    const attendanceData = {
      id: uuidv4(),
      employeeId,
      employeeName: employee?.name || '',
      date: new Date(),
      checkIn,
      checkOut: checkOut || '',
      status,
      // For future face recognition integration
      faceImage: faceImage || null,
      timestamp: new Date().toISOString(),
    };

    const attendance = await db.createAttendance(attendanceData);

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

export const getMyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const employee = await db.findEmployeeByEmail(req.user.email);
    if (!employee) {
      const error = new Error('Employee profile not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const query = { employeeId: employee.id };

    // Filter by month and year if provided
    if (month || year) {
      const monthNum = month ? parseInt(month) - 1 : null;
      const yearNum = year ? parseInt(year) : new Date().getFullYear();

      query.date = query.date || {};
      if (monthNum !== null) {
        const startDate = new Date(yearNum, monthNum, 1);
        const endDate = new Date(yearNum, monthNum + 1, 0);
        query.date.$gte = startDate;
        query.date.$lte = endDate;
      } else {
        const startDate = new Date(yearNum, 0, 1);
        const endDate = new Date(yearNum, 11, 31);
        query.date.$gte = startDate;
        query.date.$lte = endDate;
      }
    }

    const attendance = await db.findAllAttendance(query);

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
    
    const query = {};

    // Filter by month and year if provided
    if (month || year) {
      const monthNum = month ? parseInt(month) - 1 : null;
      const yearNum = year ? parseInt(year) : new Date().getFullYear();

      if (monthNum !== null) {
        const startDate = new Date(yearNum, monthNum, 1);
        const endDate = new Date(yearNum, monthNum + 1, 0);
        query.date = { $gte: startDate, $lte: endDate };
      } else {
        const startDate = new Date(yearNum, 0, 1);
        const endDate = new Date(yearNum, 11, 31);
        query.date = { $gte: startDate, $lte: endDate };
      }
    }

    const attendance = await db.findAllAttendance(query);

    // Get today's attendance
    const today = new Date().setHours(0, 0, 0, 0);
    const todayAttendance = await db.findAllAttendance({
      date: { $gte: new Date(today), $lt: new Date(today + 86400000) }
    });

    const employees = await db.findAllEmployees({ status: 'Active' });

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
      const dayAttendance = await db.findAllAttendance({
        date: { $gte: new Date(date.setHours(0,0,0,0)), $lt: new Date(date.setHours(23,59,59,999)) }
      });
      
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
    const { checkOut, status, checkIn } = req.body;

    const attendance = await db.findAttendanceById(id);
    if (!attendance) {
      const error = new Error('Attendance record not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Build update object
    const updateData = {};
    if (checkOut !== undefined) updateData.checkOut = checkOut;
    if (status !== undefined) updateData.status = status;
    if (checkIn !== undefined) updateData.checkIn = checkIn;

    const updatedAttendance = await db.updateAttendance(id, updateData);

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

/**
 * NEW: Face Recognition Attendance Endpoint
 * This endpoint will handle face recognition-based attendance
 */
export const markAttendanceWithFace = async (req, res) => {
  try {
    const { employeeId, checkIn, checkOut, faceImage, timestamp } = req.body;

    // Validation
    if (!employeeId || !checkIn) {
      const error = new Error('Employee ID and check-in time are required');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    // Verify employee identity (for future face recognition integration)
    let targetEmployeeId = employeeId;
    if (req.user.role === 'Employee') {
      const employee = await db.findEmployeeByEmail(req.user.email);
      if (!employee) {
        const error = new Error('Employee profile not found');
        error.code = 'NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }
      targetEmployeeId = employee.id;
    }

    // Check if attendance already marked for today
    const today = new Date().setHours(0, 0, 0, 0);
    const existingAttendance = await db.findAllAttendance({
      employeeId: targetEmployeeId,
      date: { $gte: new Date(today), $lt: new Date(today + 86400000) }
    });

    if (existingAttendance.length > 0) {
      const error = new Error('Attendance already marked for today');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    // Determine status based on check-in time
    const checkInHour = parseInt(checkIn.split(':')[0]);
    const status = checkInHour > 9 ? 'Late' : 'Present';

    const employee = await db.findEmployeeById(targetEmployeeId);

    // Create attendance with face image (stored for future AI matching)
    const attendanceData = {
      id: uuidv4(),
      employeeId: targetEmployeeId,
      employeeName: employee?.name || '',
      date: new Date(timestamp || Date.now()),
      checkIn,
      checkOut: checkOut || '',
      status,
      faceImage: faceImage || null, // Base64 encoded image for future processing
      timestamp: new Date().toISOString(),
    };

    const attendance = await db.createAttendance(attendanceData);

    res.status(201).json({
      success: true,
      message: 'Attendance marked with face recognition',
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

/**
 * NEW: Get today's attendance status for an employee
 */
export const getTodayAttendance = async (req, res) => {
  try {
    const { employeeId } = req.query;
    
    let targetEmployeeId = employeeId;
    
    // If Employee role, use logged-in user's ID
    if (req.user.role === 'Employee') {
      const employee = await db.findEmployeeByEmail(req.user.email);
      if (!employee) {
        const error = new Error('Employee profile not found');
        error.code = 'NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }
      targetEmployeeId = employee.id;
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const todayAttendance = await db.findAllAttendance({
      employeeId: targetEmployeeId,
      date: { $gte: new Date(today), $lt: new Date(today + 86400000) }
    });

    res.status(200).json({
      success: true,
      data: {
        marked: todayAttendance.length > 0,
        attendance: todayAttendance[0] || null,
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
