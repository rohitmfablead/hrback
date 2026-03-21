import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

export const getPayrollRecords = async (req, res) => {
  try {
    const { employeeId, month, status, year } = req.query;
    
    let payroll = db.findAll('payroll');

    // Apply filters based on user role
    if (req.user.role === 'Employee') {
      const employee = db.findOne('employees', e => e.email === req.user.email);
      if (employee) {
        payroll = payroll.filter(p => p.employeeId === employee.id);
      }
    } else if (employeeId) {
      payroll = payroll.filter(p => p.employeeId === employeeId);
    }

    if (month) {
      payroll = payroll.filter(p => p.month.toLowerCase().includes(month.toLowerCase()));
    }

    if (year) {
      payroll = payroll.filter(p => p.month.includes(year.toString()));
    }

    if (status) {
      payroll = payroll.filter(p => p.status === status);
    }

    res.status(200).json({
      success: true,
      data: {
        payroll,
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

export const getMyPayslips = async (req, res) => {
  try {
    const { year } = req.query;
    
    const employee = db.findOne('employees', e => e.email === req.user.email);
    if (!employee) {
      const error = new Error('Employee profile not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    let payroll = db.findByQuery('payroll', p => p.employeeId === employee.id);

    // Filter by year if provided
    if (year) {
      payroll = payroll.filter(p => p.month.includes(year.toString()));
    }

    res.status(200).json({
      success: true,
      data: {
        payroll,
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

export const generatePayslip = async (req, res) => {
  try {
    const { employeeId, month, bonus = 0, deductions = 0 } = req.body;

    // Validation
    if (!employeeId || !month) {
      const error = new Error('Employee ID and month are required');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    // Get employee details
    const employee = db.findById('employees', employeeId);
    if (!employee) {
      const error = new Error('Employee not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Check if payslip already generated for this month
    const existingPayslip = db.findOne('payroll', 
      p => p.employeeId === employeeId && p.month.toLowerCase() === month.toLowerCase()
    );

    if (existingPayslip) {
      const error = new Error('Payslip already generated for this month');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    const basicSalary = employee.salary || 0;
    const netSalary = basicSalary + parseFloat(bonus) - parseFloat(deductions);

    const payslip = {
      id: uuidv4(),
      employeeId,
      employeeName: employee.name,
      month,
      basicSalary,
      bonus: parseFloat(bonus),
      deductions: parseFloat(deductions),
      netSalary,
      status: 'Pending',
      generatedAt: new Date().toISOString(),
      paidAt: null,
    };

    db.insert('payroll', payslip);

    res.status(201).json({
      success: true,
      message: 'Payslip generated successfully',
      data: payslip,
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

export const markSalaryAsPaid = async (req, res) => {
  try {
    const { id } = req.params;

    const payslip = db.findById('payroll', id);
    if (!payslip) {
      const error = new Error('Payslip not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const updatedPayslip = db.update('payroll', id, {
      status: 'Paid',
      paidAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: 'Salary marked as paid',
      data: updatedPayslip,
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

export const downloadPayslip = async (req, res) => {
  try {
    const { id } = req.params;

    const payslip = db.findById('payroll', id);
    if (!payslip) {
      const error = new Error('Payslip not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Check permissions
    if (req.user.role === 'Employee') {
      const employee = db.findOne('employees', e => e.email === req.user.email);
      if (!employee || payslip.employeeId !== employee.id) {
        const error = new Error('You can only access your own payslips');
        error.code = 'FORBIDDEN';
        error.statusCode = 403;
        throw error;
      }
    }

    // Calculate detailed breakdown
    const basic = payslip.basicSalary;
    const hra = Math.round(basic * 0.4);
    const specialAllowance = Math.round(basic * 0.1);
    const totalEarnings = basic + hra + specialAllowance + payslip.bonus;
    
    const pf = Math.round(basic * 0.12);
    const tax = Math.round((basic + payslip.bonus) * 0.1);
    const professionalTax = 500;
    const totalDeductions = pf + tax + professionalTax + payslip.deductions;

    const payslipDetails = {
      ...payslip,
      paymentDetails: {
        bankName: 'HDFC Bank',
        accountNumber: 'XXXX1234',
        ifsc: 'HDFC0001234',
      },
      earnings: {
        basic,
        hra,
        specialAllowance,
        bonus: payslip.bonus,
        totalEarnings,
      },
      deductions: {
        pf,
        tax,
        professionalTax,
        other: payslip.deductions,
        totalDeductions,
      },
    };

    res.status(200).json({
      success: true,
      data: {
        payslip: payslipDetails,
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
