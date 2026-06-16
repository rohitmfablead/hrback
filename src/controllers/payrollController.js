import { v4 as uuidv4 } from 'uuid';
import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';

export const getPayrollRecords = async (req, res) => {
  try {
    const { employeeId, month, status, year } = req.query;
    
    const query = {};

    if (req.user.role === 'Employee') {
      const employee = await Employee.findOne({ email: req.user.email });
      if (employee) {
        query.employeeId = employee.id;
      } else {
        query.employeeId = 'not-found';
      }
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (month) {
      query.month = { $regex: month, $options: 'i' };
    }

    if (year) {
      // Month usually contains year in "March 2026" format
      query.month = { ...query.month, $regex: year.toString(), $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    const payroll = await Payroll.find(query);

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
    
    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      const error = new Error('Employee profile not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const query = { employeeId: employee.id };

    // Filter by year if provided
    if (year) {
      query.month = { $regex: year.toString(), $options: 'i' };
    }

    const payroll = await Payroll.find(query);

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
    const employee = await Employee.findOne({ id: employeeId });
    if (!employee) {
      const error = new Error('Employee not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Check if payslip already generated for this month
    const existingPayslip = await Payroll.findOne({
      employeeId,
      month: { $regex: new RegExp(`^${month}$`, 'i') }
    });

    if (existingPayslip) {
      const error = new Error('Payslip already generated for this month');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    const basicSalary = employee.salary || 0;
    const netSalary = basicSalary + parseFloat(bonus) - parseFloat(deductions);

    const payslip = await Payroll.create({
      id: uuidv4(),
      employeeId,
      employeeName: employee.name || `${employee.firstName} ${employee.lastName}`,
      month,
      basicSalary,
      bonus: parseFloat(bonus),
      deductions: parseFloat(deductions),
      netSalary,
      status: 'Pending',
    });

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

    const payslip = await Payroll.findById(id);
    if (!payslip) {
      const error = new Error('Payslip not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    payslip.status = 'Paid';
    payslip.paidAt = new Date();
    await payslip.save();

    res.status(200).json({
      success: true,
      message: 'Salary marked as paid',
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

export const downloadPayslip = async (req, res) => {
  try {
    const { id } = req.params;

    const payslip = await Payroll.findById(id);
    if (!payslip) {
      const error = new Error('Payslip not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Check permissions
    if (req.user.role === 'Employee') {
      const employee = await Employee.findOne({ email: req.user.email });
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
