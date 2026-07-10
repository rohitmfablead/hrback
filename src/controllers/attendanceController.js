import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import { loadFaceModels, detectFaceAndGetEmbedding, findBestFaceMatch } from '../utils/faceRecognition.js';

// --- Helper for Attendance Time Math ---
const calculateAttendanceMetrics = (checkIn, checkOut, checkIn2, checkOut2) => {
  let status = 'Present';
  let lateByMinutes = 0;
  let totalWorkedHours = '';
  let extraHours = '';
  let shortfallHours = '';

  // 1. Calculate Late Time (Threshold: 10:00 AM)
  if (checkIn) {
    const [inH, inM] = checkIn.split(':').map(Number);
    const inTotalMins = inH * 60 + inM;
    const thresholdMins = 10 * 60; // 10:00 AM

    if (inTotalMins > thresholdMins) {
      status = 'Late';
      lateByMinutes = inTotalMins - thresholdMins;
    }
  }

  // 2. Calculate Checkout Analytics (9-Hour Requirement)
  let totalWorkedMins = 0;

  const calculateShiftMins = (inTime, outTime) => {
    if (!inTime || !outTime) return 0;
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);

    const inTotalMins = inH * 60 + inM;
    let outTotalMins = outH * 60 + outM;

    if (outTotalMins < inTotalMins) {
      outTotalMins += 24 * 60; // Overnight
    }

    return outTotalMins - inTotalMins;
  };

  if (checkIn && checkOut) {
    totalWorkedMins += calculateShiftMins(checkIn, checkOut);
  }

  if (checkIn2 && checkOut2) {
    totalWorkedMins += calculateShiftMins(checkIn2, checkOut2);
  }

  if (totalWorkedMins > 0) {
    const requiredMins = 9 * 60; // 9 hours
    const formatMins = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

    totalWorkedHours = formatMins(totalWorkedMins);

    if (totalWorkedMins > requiredMins) {
      extraHours = formatMins(totalWorkedMins - requiredMins);
    } else if (totalWorkedMins < requiredMins) {
      shortfallHours = formatMins(requiredMins - totalWorkedMins);
    }
  }

  return { status, lateByMinutes, totalWorkedHours, extraHours, shortfallHours };
};


export const getAttendanceRecords = async (req, res) => {
  try {
    const { employeeId, fromDate, toDate, status } = req.query;

    let query = {};

    // Apply filters based on user role
    if (req.user.role === 'Employee') {
      const employee = await Employee.findOne({ email: req.user.email });
      if (employee) {
        query.employeeId = employee.id;
      }
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }

    if (status) {
      query.status = status;
    }

    const attendance = await Attendance.find(query).sort({ createdAt: -1 }).lean();

    // Format dates to YYYY-MM-DD for the frontend
    const formattedAttendance = attendance.map(a => ({
      ...a,
      date: new Date(a.date).toISOString().split('T')[0]
    }));

    res.status(200).json({
      success: true,
      data: {
        attendance: formattedAttendance,
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
    const { employeeId, checkIn, checkOut, checkIn2, checkOut2, date } = req.body;

    // Validation
    if (!employeeId) {
      const error = new Error('Employee ID is required');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }
    // Note: checkIn is optional for checkout when attendance already exists

    // Employees can only mark their own attendance
    let targetEmployeeId = employeeId;
    if (req.user.role === 'Employee') {
      const employee = await Employee.findOne({ email: req.user.email });
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
    const targetDateStr = date || today;
    const existingAttendance = await Attendance.findOne({
      employeeId: employeeId,
      date: new Date(targetDateStr)
    });

    if (existingAttendance) {
      let updated = false;
      // If checkout time provided and attendance not yet checked out, update record
      if (checkOut && !existingAttendance.checkOut) {
        existingAttendance.checkOut = checkOut;
        updated = true;
      } else if (checkIn2 && !existingAttendance.checkIn2) {
        existingAttendance.checkIn2 = checkIn2;
        updated = true;
      } else if (checkOut2 && !existingAttendance.checkOut2) {
        existingAttendance.checkOut2 = checkOut2;
        updated = true;
      }

      if (updated) {
        const metrics = calculateAttendanceMetrics(
          existingAttendance.checkIn, 
          existingAttendance.checkOut,
          existingAttendance.checkIn2,
          existingAttendance.checkOut2
        );
        Object.assign(existingAttendance, metrics);
        await existingAttendance.save();
        return res.status(200).json({
          success: true,
          message: 'Attendance updated successfully',
          data: existingAttendance,
        });
      }

      const error = new Error('Attendance already fully marked for today');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    // Calculate advanced metrics
    const metrics = calculateAttendanceMetrics(checkIn, checkOut, checkIn2, checkOut2);

    const emp = await Employee.findOne({ id: employeeId });
    const attendance = await Attendance.create({
      id: uuidv4(),
      employeeId,
      employeeName: emp?.name || `${emp?.firstName} ${emp?.lastName}` || '',
      date: new Date(targetDateStr),
      checkIn,
      checkOut: checkOut || '',
      checkIn2: checkIn2 || '',
      checkOut2: checkOut2 || '',
      ...metrics
    });

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
    const queryEmbedding = await detectFaceAndGetEmbedding(req.file);

    // Get the logged in user's registered face
    const userWithFace = await User.findOne({
      email: req.user.email,
      faceRegistered: true,
      faceEmbedding: { $exists: true, $ne: [] }
    });

    if (!userWithFace) {
      const error = new Error('You have not registered your face yet. Please register your face first.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Create map of user embeddings with only the logged in user
    const userEmbeddings = {
      [userWithFace.id]: userWithFace.faceEmbedding
    };

    // Find best match
    const matchResult = findBestFaceMatch(queryEmbedding, userEmbeddings, 0.5);

    if (!matchResult.isMatch || !matchResult.userId) {
      const error = new Error('Face not recognized. Please try again.');
      error.code = 'FACE_NOT_RECOGNIZED';
      error.statusCode = 403;
      throw error;
    }

    // Find the matched user (will be the logged-in user if match is successful)
    const matchedUser = userWithFace;

    console.log(`✅ Face matched: ${matchedUser.name} (distance: ${matchResult.distance.toFixed(4)})`);

    // Note: We use matchedUser directly instead of fetching Employee to support Admin/HR accounts
    // who might not have an Employee profile, and to be more resilient.

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const checkInTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employeeId: matchedUser.id,
      date: { $gte: startOfDay, $lt: endOfDay }
    });

    if (existingAttendance) {
      if (!existingAttendance.checkOut) {
        const error = new Error('You are already checked in. Please check out first.');
        error.code = 'CONFLICT';
        error.statusCode = 409;
        throw error;
      }
      if (existingAttendance.checkIn2) {
        const error = new Error('Already fully checked in for today.');
        error.code = 'CONFLICT';
        error.statusCode = 409;
        throw error;
      }

      // Checking into 2nd time
      existingAttendance.checkIn2 = checkInTime;
      const metrics = calculateAttendanceMetrics(
        existingAttendance.checkIn,
        existingAttendance.checkOut,
        existingAttendance.checkIn2,
        existingAttendance.checkOut2
      );
      Object.assign(existingAttendance, metrics);
      await existingAttendance.save();
      
      console.log(`✅ 2nd Check-in successful for ${matchedUser.name} at ${checkInTime}`);
      return res.status(201).json({
        success: true,
        message: '2nd Check-in successful',
        data: {
          checkIn2: checkInTime,
          ...existingAttendance.toObject(),
        },
      });
    }

    // Determine status based on check-in time using advanced metrics
    const metrics = calculateAttendanceMetrics(checkInTime, '');

    // Create attendance record
    const attendance = {
      id: uuidv4(),
      employeeId: matchedUser.id,
      employeeName: matchedUser.name,
      date: new Date(today),
      checkIn: checkInTime,
      checkOut: '',
      ...metrics,
    };

    // Save to database
    await Attendance.create(attendance);

    console.log(`✅ Check-in successful for ${matchedUser.name} at ${checkInTime}`);

    res.status(201).json({
      success: true,
      message: 'Check-in successful',
      data: {
        checkIn: checkInTime,
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
    const queryEmbedding = await detectFaceAndGetEmbedding(req.file);

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

    // Ensure the face matches the logged in user (to prevent marking someone else's attendance)
    if (matchedUser.id !== req.user.id) {
      const error = new Error('Face matched another user. Please scan your own face.');
      error.code = 'FACE_MISMATCH';
      error.statusCode = 403;
      throw error;
    }

    // Note: We use matchedUser directly instead of fetching Employee to support Admin/HR accounts
    // who might not have an Employee profile, and to be more resilient.

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const checkOutTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Find today's attendance record
    const todayAttendance = await Attendance.findOne({
      employeeId: matchedUser.id,
      date: { $gte: startOfDay, $lt: endOfDay }
    });

    if (!todayAttendance) {
      const error = new Error('No check-in found for today. Please check in first.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (todayAttendance.checkIn2 && !todayAttendance.checkOut2) {
      todayAttendance.checkOut2 = checkOutTime;
    } else if (!todayAttendance.checkOut) {
      todayAttendance.checkOut = checkOutTime;
    } else {
      const error = new Error('Already fully checked out today');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    const metrics = calculateAttendanceMetrics(
      todayAttendance.checkIn,
      todayAttendance.checkOut,
      todayAttendance.checkIn2,
      todayAttendance.checkOut2
    );
    Object.assign(todayAttendance, metrics);
    await todayAttendance.save();

    console.log(`✅ Check-out successful for ${matchedUser.name} at ${checkOutTime}`);

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

export const directCheckIn = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const checkInTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setDate(endOfDay.getDate() + 1);

    let employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      employee = { id: req.user.id, name: req.user.name };
    }

    const existingAttendance = await Attendance.findOne({
      employeeId: employee.id,
      date: { $gte: startOfDay, $lt: endOfDay }
    });

    if (existingAttendance) {
      if (!existingAttendance.checkOut) {
        return res.status(400).json({ success: false, error: { message: 'Already checked in. Please check out first.' } });
      }
      if (existingAttendance.checkIn2) {
        return res.status(400).json({ success: false, error: { message: 'Already fully checked in today.' } });
      }

      existingAttendance.checkIn2 = checkInTime;
      const metrics = calculateAttendanceMetrics(
        existingAttendance.checkIn,
        existingAttendance.checkOut,
        existingAttendance.checkIn2,
        existingAttendance.checkOut2
      );
      Object.assign(existingAttendance, metrics);
      await existingAttendance.save();
      const io = req.app.get('io');
      if (io) {
        io.emit("receive_notification", {
          title: "Attendance Update",
          message: `${employee.name} checked in (Shift 2)`
        });
      }
      return res.status(200).json({ success: true, data: { attendance: existingAttendance } });
    }

    const { status, lateByMinutes } = calculateAttendanceMetrics(checkInTime, null);

    const attendance = new Attendance({
      id: uuidv4(),
      employeeId: employee.id,
      employeeName: employee.name,
      date: startOfDay,
      checkIn: checkInTime,
      status: status,
      lateByMinutes: lateByMinutes
    });

    await attendance.save();

    const io = req.app.get('io');
    console.log("Socket IO Instance available:", !!io);
    if (io) {
      console.log("Emitting attendance notification...");
      io.emit("receive_notification", {
        title: "Attendance Update",
        message: `${employee.name} just checked in`
      });
    }

    res.status(200).json({ success: true, data: { attendance } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const directCheckOut = async (req, res) => {
  try {
    console.log('🚪 Direct check-out request received from user:', req.user.email);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const checkOutTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Find today's attendance record
    const todayAttendance = await Attendance.findOne({
      employeeId: req.user.id,
      date: { $gte: startOfDay, $lt: endOfDay }
    });

    if (!todayAttendance) {
      const error = new Error('No check-in found for today. Please check in first.');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (todayAttendance.checkIn2 && !todayAttendance.checkOut2) {
      todayAttendance.checkOut2 = checkOutTime;
    } else if (!todayAttendance.checkOut) {
      todayAttendance.checkOut = checkOutTime;
    } else {
      const error = new Error('Already fully checked out today');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    const metrics = calculateAttendanceMetrics(
      todayAttendance.checkIn, 
      todayAttendance.checkOut,
      todayAttendance.checkIn2,
      todayAttendance.checkOut2
    );
    Object.assign(todayAttendance, metrics);
    await todayAttendance.save();

    console.log(`✅ Direct check-out successful for ${req.user.name} at ${checkOutTime}`);

    const io = req.app.get('io');
    if (io) {
      io.emit("receive_notification", {
        title: "Attendance Update",
        message: `${req.user.name} just checked out`
      });
    }

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

    const employee = await Employee.findOne({ email: req.user.email });
    let query = { employeeId: employee ? employee.id : req.user.id };

    // Filter by month and year if provided
    if (month || year) {
      const monthNum = month ? parseInt(month) : null;
      const yearNum = year ? parseInt(year) : new Date().getFullYear();

      const startDate = new Date(yearNum, monthNum ? monthNum - 1 : 0, 1);
      const endDate = new Date(yearNum, monthNum ? monthNum : 12, 0);

      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(query).lean();

    const attendance = attendanceRecords.map(a => ({
      ...a,
      date: new Date(a.date).toISOString().split('T')[0]
    }));

    // Generate missing days
    let minDate = employee?.joiningDate ? new Date(employee.joiningDate) : new Date();
    if (attendance.length > 0) {
      const earliestAtt = new Date(Math.min(...attendance.map(a => new Date(a.date))));
      if (earliestAtt < minDate) minDate = earliestAtt;
    }

    if (!month && !year) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      if (minDate < cutoff) minDate = cutoff;
    } else {
      const monthNum = month ? parseInt(month) : null;
      const yearNum = year ? parseInt(year) : new Date().getFullYear();
      const firstDayOfMonth = new Date(yearNum, monthNum ? monthNum - 1 : 0, 1);
      
      minDate = firstDayOfMonth;
      if (employee?.joiningDate && minDate < new Date(employee.joiningDate)) {
        minDate = new Date(employee.joiningDate);
      }
    }

    const today = new Date();
    const end = (month || year) ? new Date(year ? parseInt(year) : today.getFullYear(), month ? parseInt(month) : 12, 0) : today;
    const actualEnd = end > today ? today : end;

    const existingDates = new Set(attendance.map(a => a.date));

    for (let d = new Date(minDate); d <= actualEnd; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      if (!existingDates.has(dStr)) {
        if (d.getDay() === 0 || d.getDay() === 6) {
          attendance.push({ id: `wo-${dStr}`, date: dStr, status: 'WO' });
        } else if (d < today || dStr === today.toISOString().split('T')[0]) {
          attendance.push({ id: `absent-${dStr}`, date: dStr, status: 'Absent' });
        }
      }
    }
    
    attendance.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate summary
    const summary = {
      present: attendance.filter(a => a.status === 'Present').length,
      absent: attendance.filter(a => a.status === 'Absent').length,
      wo: attendance.filter(a => a.status === 'WO').length,
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

export const getTodayStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const employee = await Employee.findOne({ email: req.user.email });
    const employeeId = employee ? employee.id : req.user.id;

    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const attendance = await Attendance.findOne({
      employeeId: employeeId,
      date: { $gte: startOfDay, $lt: endOfDay }
    });

    if (attendance) {
      const parseTime = (timeStr) => {
        if (!timeStr) return Date.now();
        if (timeStr.includes('T')) return new Date(timeStr).getTime();
        const [hours, minutes] = timeStr.split(':').map(Number);
        const todayObj = new Date();
        todayObj.setHours(hours || 0, minutes || 0, 0, 0);
        return todayObj.getTime();
      };

      const checkInMs = parseTime(attendance.checkIn);
      const endMs = attendance.checkOut ? parseTime(attendance.checkOut) : (attendance.checkIn2 ? parseTime(attendance.checkOut) : Date.now());
      let diffMs = endMs - checkInMs;

      if (attendance.checkIn2) {
        const checkIn2Ms = parseTime(attendance.checkIn2);
        const end2Ms = attendance.checkOut2 ? parseTime(attendance.checkOut2) : Date.now();
        diffMs += (end2Ms - checkIn2Ms);
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      const totalDec = diffMs / (1000 * 60 * 60);
      const remDec = Math.max(0, 8 - totalDec);
      const remHours = Math.floor(remDec);
      const remMins = Math.floor((remDec - remHours) * 60);

      return res.status(200).json({
        success: true,
        data: {
          isCheckedIn: true,
          isCheckedOut: !!attendance.checkOut,
          isCheckedIn2: !!attendance.checkIn2,
          isCheckedOut2: !!attendance.checkOut2,
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          checkIn2: attendance.checkIn2,
          checkOut2: attendance.checkOut2,
          status: attendance.status,
          hoursCompleted: `${hours}h ${minutes}m`,
          hoursRemaining: remDec > 0 ? `${remHours}h ${remMins}m` : "Done"
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        isCheckedIn: false,
        isCheckedOut: false
      }
    });
  } catch (error) {
    console.error('❌ Get today status error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch today status'
      }
    });
  }
};

export const getAttendanceCalendar = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Employee') {
      const employee = await Employee.findOne({ email: req.user.email });
      if (employee) {
        query.employeeId = employee.id;
      }
    }
    const attendance = await Attendance.find(query).sort({ date: 1 }).lean();
    const formatted = attendance.map(a => ({
      ...a,
      date: new Date(a.date).toISOString().split('T')[0],
    }));
    res.status(200).json({
      success: true,
      data: { attendance: formatted },
    });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }
    throw error;
  }
};

export const getAttendanceStatistics = async (req, res) => {
  try {
    const { month, year } = req.query;

    let query = {};

    // Filter by month and year if provided
    if (month || year) {
      const monthNum = month ? parseInt(month) : null;
      const yearNum = year ? parseInt(year) : new Date().getFullYear();

      const startDate = new Date(yearNum, monthNum ? monthNum - 1 : 0, 1);
      const endDate = new Date(yearNum, monthNum ? monthNum : 12, 0);

      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(query).lean();
    const attendance = attendanceRecords.map(a => ({
      ...a,
      date: new Date(a.date).toISOString().split('T')[0]
    }));

    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today);

    const employees = await Employee.find({ status: 'Active' });

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

    const attendance = await Attendance.findOne({ id });
    if (!attendance) {
      const error = new Error('Attendance record not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const finalCheckIn = updateData.checkIn || attendance.checkIn;
    const finalCheckOut = updateData.checkOut !== undefined ? updateData.checkOut : attendance.checkOut;

    const metrics = calculateAttendanceMetrics(finalCheckIn, finalCheckOut);
    const finalUpdateData = { ...updateData, ...metrics };

    const updatedAttendance = await Attendance.findOneAndUpdate(
      { id },
      finalUpdateData,
      { new: true }
    );

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
