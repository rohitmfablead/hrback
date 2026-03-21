import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

export const getAllLeaveRequests = async (req, res) => {
  try {
    const { employeeId, status, leaveType, fromDate, toDate } = req.query;
    
    let leaves = db.findAll('leaves');

    // Apply filters based on user role
    if (req.user.role === 'Employee') {
      const employee = db.findOne('employees', e => e.email === req.user.email);
      if (employee) {
        leaves = leaves.filter(l => l.employeeId === employee.id);
      }
    } else if (employeeId) {
      leaves = leaves.filter(l => l.employeeId === employeeId);
    }

    if (status) {
      leaves = leaves.filter(l => l.status === status);
    }

    if (leaveType) {
      leaves = leaves.filter(l => l.leaveType === leaveType);
    }

    if (fromDate) {
      leaves = leaves.filter(l => l.fromDate >= fromDate);
    }

    if (toDate) {
      leaves = leaves.filter(l => l.toDate <= toDate);
    }

    res.status(200).json({
      success: true,
      data: {
        leaves,
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
    const employee = db.findOne('employees', e => e.email === req.user.email);
    if (!employee) {
      const error = new Error('Employee profile not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const leave = {
      id: uuidv4(),
      employeeId: employee.id,
      employeeName: employee.name,
      leaveType,
      fromDate,
      toDate,
      reason,
      status: 'Pending',
      reviewedBy: null,
      reviewedAt: null,
      remarks: '',
      createdAt: new Date().toISOString(),
    };

    db.insert('leaves', leave);

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: leave,
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

    const leave = db.findById('leaves', id);
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

    const updatedLeave = db.update('leaves', id, {
      status: 'Approved',
      reviewedBy: req.user.id,
      reviewedAt: new Date().toISOString(),
      remarks,
    });

    res.status(200).json({
      success: true,
      message: 'Leave approved successfully',
      data: updatedLeave,
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

    const leave = db.findById('leaves', id);
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

    const updatedLeave = db.update('leaves', id, {
      status: 'Rejected',
      reviewedBy: req.user.id,
      reviewedAt: new Date().toISOString(),
      remarks,
    });

    res.status(200).json({
      success: true,
      message: 'Leave rejected successfully',
      data: updatedLeave,
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

    const leave = db.findById('leaves', id);
    if (!leave) {
      const error = new Error('Leave request not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Employees can only cancel their own leave requests
    if (req.user.role === 'Employee') {
      const employee = db.findOne('employees', e => e.email === req.user.email);
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

    db.delete('leaves', id);

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
      const employee = db.findOne('employees', e => e.email === req.user.email);
      if (!employee) {
        const error = new Error('Employee profile not found');
        error.code = 'NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }
      employeeId = employee.id;
      employeeName = employee.name;
    } else {
      const emp = db.findById('employees', employeeId);
      if (emp) {
        employeeName = emp.name;
      }
    }

    // Get all leaves for this employee
    const allLeaves = db.findByQuery('leaves', l => l.employeeId === employeeId);
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
