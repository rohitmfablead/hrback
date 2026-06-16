import { v4 as uuidv4 } from 'uuid';
import Employee from '../models/Employee.js';
import Leave from '../models/Leave.js';

export const getAllLeaveRequests = async (req, res) => {
  try {
    const { employeeId, status, leaveType, fromDate, toDate } = req.query;
    
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

    if (status) {
      query.status = status;
    }

    if (leaveType) {
      query.leaveType = leaveType;
    }

    if (fromDate || toDate) {
      query.fromDate = {};
      if (fromDate) query.fromDate.$gte = new Date(fromDate);
      if (toDate) query.fromDate.$lte = new Date(toDate);
    }

    const leaves = await Leave.find(query).sort({ createdAt: -1 }).lean();

    // Format dates back to YYYY-MM-DD for frontend compatibility
    const formattedLeaves = leaves.map(l => ({
      ...l,
      fromDate: l.fromDate ? new Date(l.fromDate).toISOString().split('T')[0] : '',
      toDate: l.toDate ? new Date(l.toDate).toISOString().split('T')[0] : ''
    }));

    res.status(200).json({
      success: true,
      data: {
        leaves: formattedLeaves,
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

export const applyForLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;

    // Validation
    if (!leaveType || !fromDate || !toDate || !reason) {
      const error = new Error('Leave type, from date, to date and reason are required');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    // Get employee
    let employee;
    if ((req.user.role === 'Admin' || req.user.role === 'HR') && req.body.employeeId) {
      employee = await Employee.findOne({ id: req.body.employeeId });
    } else {
      employee = await Employee.findOne({ email: req.user.email });
    }
    
    if (!employee) {
      const error = new Error('Employee profile not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const leave = await Leave.create({
      id: uuidv4(),
      employeeId: employee.id,
      employeeName: employee.name || `${employee.firstName} ${employee.lastName}`,
      leaveType,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
      status: 'Pending',
      remarks: '',
    });

    const formattedLeave = {
      ...leave.toObject(),
      fromDate: new Date(leave.fromDate).toISOString().split('T')[0],
      toDate: new Date(leave.toDate).toISOString().split('T')[0]
    };

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: formattedLeave,
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

export const approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks = 'Approved' } = req.body;

    const leave = await Leave.findOne({ id });
    if (!leave) {
      const error = new Error('Leave request not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (leave.status !== 'Pending') {
      const error = new Error('Leave request is not pending');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    const updatedLeave = await Leave.findOneAndUpdate(
      { id },
      {
        status: 'Approved',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        remarks,
      },
      { new: true }
    );

    const formattedLeave = {
      ...updatedLeave.toObject(),
      fromDate: updatedLeave.fromDate ? new Date(updatedLeave.fromDate).toISOString().split('T')[0] : '',
      toDate: updatedLeave.toDate ? new Date(updatedLeave.toDate).toISOString().split('T')[0] : ''
    };

    res.status(200).json({
      success: true,
      message: 'Leave approved successfully',
      data: formattedLeave,
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

export const rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks = 'Rejected' } = req.body;

    const leave = await Leave.findOne({ id });
    if (!leave) {
      const error = new Error('Leave request not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (leave.status !== 'Pending') {
      const error = new Error('Leave request is not pending');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    const updatedLeave = await Leave.findOneAndUpdate(
      { id },
      {
        status: 'Rejected',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        remarks,
      },
      { new: true }
    );

    const formattedLeave = {
      ...updatedLeave.toObject(),
      fromDate: updatedLeave.fromDate ? new Date(updatedLeave.fromDate).toISOString().split('T')[0] : '',
      toDate: updatedLeave.toDate ? new Date(updatedLeave.toDate).toISOString().split('T')[0] : ''
    };

    res.status(200).json({
      success: true,
      message: 'Leave rejected successfully',
      data: formattedLeave,
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

export const cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await Leave.findOne({ id });
    if (!leave) {
      const error = new Error('Leave request not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Employees can only cancel their own leave requests
    if (req.user.role === 'Employee') {
      const employee = await Employee.findOne({ email: req.user.email });
      if (!employee || leave.employeeId !== employee.id) {
        const error = new Error('You can only cancel your own leave requests');
        error.code = 'FORBIDDEN';
        error.statusCode = 403;
        throw error;
      }
    }

    if (leave.status !== 'Pending') {
      const error = new Error('Only pending leave requests can be cancelled');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    await Leave.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
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

export const getLeaveBalance = async (req, res) => {
  try {
    let employeeId = req.query.employeeId;
    let employeeName = '';

    // If no employeeId provided, use current user
    if (!employeeId || req.user.role === 'Employee') {
      const employee = await Employee.findOne({ email: req.user.email });
      if (!employee) {
        const error = new Error('Employee profile not found');
        error.code = 'NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }
      employeeId = employee.id;
      employeeName = employee.name || `${employee.firstName} ${employee.lastName}`;
    } else {
      const emp = await Employee.findOne({ id: employeeId });
      if (emp) {
        employeeName = emp.name || `${emp.firstName} ${emp.lastName}`;
      }
    }

    // Get all leaves for this employee
    const allLeaves = await Leave.find({ employeeId }).lean();
    const approvedLeaves = allLeaves.filter(l => l.status === 'Approved');

    // Calculate used leaves by type
    const usedThisYear = {};
    const currentYear = new Date().getFullYear();
    
    approvedLeaves.forEach(leave => {
      const leaveYear = new Date(leave.fromDate).getFullYear();
      if (leaveYear === currentYear) {
        usedThisYear[leave.leaveType] = (usedThisYear[leave.leaveType] || 0) + 1;
      }
    });

    // Default leave balances (can be customized per employee)
    const defaultBalances = {
      sickLeave: 7,
      casualLeave: 12,
      annualLeave: 20,
      maternityLeave: 90,
      paternityLeave: 15,
    };

    const leaveBalance = {};
    Object.keys(defaultBalances).forEach(type => {
      leaveBalance[type] = defaultBalances[type] - (usedThisYear[type] || 0);
    });

    res.status(200).json({
      success: true,
      data: {
        employeeId,
        employeeName,
        leaveBalance,
        usedThisYear,
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

export const getLeaveCalendar = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Employee') {
      const employee = await Employee.findOne({ email: req.user.email });
      if (employee) query.employeeId = employee.id;
    }
    const leaves = await Leave.find(query).sort({ date: 1 }).lean();
    const formatted = leaves.map(l => ({
      ...l,
      date: new Date(l.date).toISOString().split('T')[0],
    }));
    res.status(200).json({
      success: true,
      data: { leaves: formatted },
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
