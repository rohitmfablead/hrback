import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to generate random password
const generateRandomPassword = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const getAllEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, status } = req.query;
    
    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) query.department = department;
    if (status) query.status = status;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    const options = {
      skip: (pageNum - 1) * limitNum,
      limit: limitNum,
      sort: { createdAt: -1 }
    };

    const employees = await db.findAllEmployees(query, options);
    const totalCount = await db.findAllEmployees(query).then(arr => arr.length);

    res.status(200).json({
      success: true,
      data: {
        employees,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum * limitNum < totalCount,
          hasPrevPage: pageNum > 1,
        },
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

export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await db.findEmployeeById(id);

    if (!employee) {
      const error = new Error('Employee not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: employee,
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

export const createEmployee = async (req, res) => {
  try {
    console.log('📨 Request received:', {
      method: req.method,
      url: req.url,
      contentType: req.headers['content-type'],
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
    });
    
    const { id, name, email, phone, department, designation, role, password: providedPassword, salary, joinDate, status } = req.body;
    
    // Handle profile picture upload
    let avatarUrl = '';
    if (req.file) {
      // Save uploaded file to disk and get full URL
      // Use PORT from environment or default to 5000
      const port = process.env.PORT || '5000';
      const baseUrl = `http://localhost:${port}`;
      avatarUrl = `${baseUrl}/uploads/employees/${req.file.filename}`;
      console.log(`📷 Profile picture uploaded:`, {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: avatarUrl,
      });
    } else {
      console.log('❌ No file received in req.file');
    }

    // Validation
    if (!name || !email || !department || !role) {
      const error = new Error('Name, email, department and role are required');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    // Auto-generate password if not provided
    const generatedPassword = providedPassword || generateRandomPassword();
    console.log(`🔐 Password ${providedPassword ? 'provided' : 'auto-generated'} for ${email}`);
    console.log(`📝 Generated Password: ${generatedPassword}`);

    // Normalize status to match enum values ('Active' or 'Inactive')
    const normalizedStatus = status === 'active' || status === 'Active' ? 'Active' : 
                             status === 'inactive' || status === 'Inactive' ? 'Inactive' : 
                             'Active';

    // Check if email already exists in Employee collection
    const existingEmployee = await db.findEmployeeByEmail(email);
    if (existingEmployee) {
      const error = new Error('Employee with this email already exists');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    // Check if User account already exists with this email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User account already exists with this email');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Generate or use provided employee ID
    const employeeId = id || `EMP${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${Math.floor(1000 + Math.random() * 9000)}`;

    console.log(`Creating employee account:`, {
      id: employeeId,
      email,
      role,
    });

    // Create User account for login
    const user = await User.create({
      id: employeeId,
      name,
      email,
      password: hashedPassword,
      role: role || 'Employee',
      avatar: avatarUrl || name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2), // Use uploaded image or initials
      phone,
      department,
    });

    console.log(`✓ User account created for ${email} with ID: ${user.id}`);
    console.log(`🖼️ User avatar saved:`, user.avatar);

    // Create employee record
    const employee = await db.createEmployee({
      id: user.id,
      name,
      email,
      phone: phone || '',
      department,
      designation: designation || 'Team Member',
      role: role || 'Employee',
      salary: parseFloat(salary) || 0,
      joinDate: joinDate || new Date(),
      status: normalizedStatus,
      avatar: user.avatar, // Copy avatar from User to Employee
    });

    console.log(`👤 Employee record created with avatar:`, employee.avatar);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully with login credentials',
      data: {
        employee,
        credentials: {
          id: user.id,
          email: user.email,
          password: generatedPassword, // Send auto-generated password
          isGenerated: !providedPassword,
        },
        avatar: employee.avatar, // Include avatar URL in response
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

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle profile picture upload for update
    if (req.file) {
      const port = process.env.PORT || '5000';
      const baseUrl = `http://localhost:${port}`;
      updateData.avatar = `${baseUrl}/uploads/employees/${req.file.filename}`;
      console.log(`📷 Profile picture updated:`, {
        originalName: req.file.originalname,
        filename: req.file.filename,
        url: updateData.avatar,
      });
    } else {
      console.log('❌ No file received in req.file for update');
    }

    // Normalize status if it's being updated
    if (updateData.status !== undefined) {
      updateData.status = updateData.status === 'active' || updateData.status === 'Active' ? 'Active' :
                          updateData.status === 'inactive' || updateData.status === 'Inactive' ? 'Inactive' :
                          updateData.status;
    }

    const employee = await db.findEmployeeById(id);
    if (!employee) {
      const error = new Error('Employee not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== employee.email) {
      const existingEmployee = await db.findEmployeeByEmail(updateData.email);
      if (existingEmployee && existingEmployee.id !== id) {
        const error = new Error('Employee with this email already exists');
        error.code = 'CONFLICT';
        error.statusCode = 409;
        throw error;
      }
    }

    // Update Employee record
    const updatedEmployee = await db.updateEmployee(id, updateData);
    
    // Also update User record if avatar is being updated
    if (updateData.avatar) {
      await User.findOneAndUpdate({ email: employee.email }, { avatar: updateData.avatar });
      console.log(`🖼️ User avatar also updated to:`, updateData.avatar);
    }

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee,
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

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await db.findEmployeeById(id);

    if (!employee) {
      const error = new Error('Employee not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    await db.deleteEmployee(id);

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully',
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

export const getMyProfile = async (req, res) => {
  try {
    const employee = await db.findEmployeeByEmail(req.user.email);

    if (!employee) {
      const error = new Error('Employee profile not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: employee,
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
