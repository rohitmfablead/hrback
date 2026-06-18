import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '../utils/email.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import User from '../models/User.js';
import { detectFaceAndGetEmbedding, loadFaceModels } from '../utils/faceRecognition.js';

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
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) query.department = department;
    if (status) query.status = status;

    // Restrict HR to only see regular Employees (prevent viewing Admin or other HRs)
    if (req.user && req.user.role === 'HR') {
      query.role = { $nin: ['Admin', 'HR'] };
    }

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
    
    const { id, firstName, lastName, email, phone, department, designation, role, password: providedPassword, salary, joiningDate, status, profilePicture, faceRegistration } = req.body;
    
    // Handle profile picture upload (binary)
    let avatarUrl = '';
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      const file = req.files.avatar[0];
      const port = process.env.PORT || '5000';
      const baseUrl = `http://localhost:${port}`;
      avatarUrl = `${baseUrl}/uploads/employees/${file.filename}`;
      console.log(`📷 Profile picture uploaded:`, {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        url: avatarUrl,
      });
    } else {
      console.log('❌ No profile picture file received');
    }

    // Handle face registration binary upload
    let faceBuffer = null;
    if (req.files && req.files.faceRegistration && req.files.faceRegistration[0]) {
      const faceFile = req.files.faceRegistration[0];
      faceBuffer = fs.readFileSync(faceFile.path);
      console.log('📷 Face binary uploaded for registration');
    }

    // Validation
    if (!firstName || !lastName || !email || !department || !role) {
      const error = new Error('FirstName, lastName, email, department and role are required');
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

    // Validate required fields
    if (!firstName || !lastName || !email || !department) {
      const error = new Error('Missing required fields (firstName, lastName, email, department)');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    // Check if employee already exists in Employee collection
    const existingEmployee = await db.findEmployeeByEmail(email);
    if (existingEmployee) {
      const error = new Error('Employee already exists with this email');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    // Clean up any orphaned User credentials before proceeding
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`🧹 Cleaning up orphaned User credential for email: ${email}`);
      await User.deleteOne({ email });
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

    // Process face registration embedding if image is provided
    let parsedFaceRegistration = faceRegistration;
    if (typeof faceRegistration === 'string') {
        try { parsedFaceRegistration = JSON.parse(faceRegistration); } catch (e) {}
    }

    let faceEmbedding = [];
    let isFaceRegistered = false;
    
    if ((parsedFaceRegistration && parsedFaceRegistration.faceImage) || faceBuffer) {
      try {
        await loadFaceModels();
        let buffer = faceBuffer;
        if (!buffer && parsedFaceRegistration.faceImage) {
           const base64Data = parsedFaceRegistration.faceImage.replace(/^data:image\/\w+;base64,/, "");
           buffer = Buffer.from(base64Data, 'base64');
        }
        faceEmbedding = await detectFaceAndGetEmbedding(buffer);
        isFaceRegistered = true;
        if (!parsedFaceRegistration) parsedFaceRegistration = {};
        parsedFaceRegistration.faceEmbedding = faceEmbedding;
        parsedFaceRegistration.isRegistered = true;
        console.log(`✅ Extracted face embedding for new employee`);
      } catch (err) {
        console.error('❌ Failed to get embedding from image:', err.message);
      }
    }

    // Create User account for login
    let defaultAvatar = avatarUrl || (profilePicture?.url) || '';
    if (!defaultAvatar && firstName && lastName) {
      defaultAvatar = `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    
    const user = await User.create({
      id: employeeId,
      name: `${firstName} ${lastName}`,
      email,
      password: hashedPassword,
      role: role || 'Employee',
      avatar: defaultAvatar,
      phone,
      department,
      faceRegistered: isFaceRegistered,
      faceEmbedding: faceEmbedding,
    });

    console.log(`✓ User account created for ${email} with ID: ${user.id}`);
    console.log(`🖼️ User avatar saved:`, user.avatar);

    // Create employee record
    let parsedProfilePicture = profilePicture;
    if (typeof profilePicture === 'string') {
        try { parsedProfilePicture = JSON.parse(profilePicture); } catch (e) {}
    }

    const finalProfilePicture = {
      type: parsedProfilePicture?.type || (req.files?.avatar ? 'upload' : 'none'),
      url: avatarUrl || parsedProfilePicture?.url || ''
    };

    let employee;
    try {
      employee = await db.createEmployee({
        id: user.id,
        firstName,
        lastName,
        email,
        phone: phone || '',
        department,
        designation: designation || 'Team Member',
        role: role || 'Employee',
        salary: parseFloat(salary) || 0,
        joiningDate: joiningDate || new Date(),
        status: normalizedStatus,
        profilePicture: finalProfilePicture,
        faceRegistration: parsedFaceRegistration || {
          isRegistered: false,
          faceImage: "",
          faceEmbedding: [],
        }
      });
    } catch (empError) {
      // If employee creation fails, cleanup the user we just created
      await User.deleteOne({ id: user.id });
      throw empError;
    }

    console.log(`👤 Employee record created with avatar:`, employee.avatar);

    // Send the welcome email with credentials
    sendWelcomeEmail(user.email, employee.firstName, employee.id, generatedPassword);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully with login credentials',
      data: {
        employee,
        credentials: {
          id: user.id,
          email: user.email,
          password: generatedPassword,
          isGenerated: !providedPassword,
        },
        profilePicture: employee.profilePicture,
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
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      const port = process.env.PORT || '5000';
      const baseUrl = `http://localhost:${port}`;
      
      updateData.profilePicture = {
        type: 'upload',
        url: `${baseUrl}/uploads/employees/${req.files.avatar[0].filename}`
      };
      
      console.log(`📷 Profile picture updated:`, {
        originalName: req.files.avatar[0].originalname,
        filename: req.files.avatar[0].filename,
        url: updateData.profilePicture.url,
      });
    } else {
      console.log('❌ No file received in req.files.avatar for update');
      if (typeof updateData.profilePicture === 'string') {
        try { updateData.profilePicture = JSON.parse(updateData.profilePicture); } catch (e) {}
      }
    }
    
    if (typeof updateData.faceRegistration === 'string') {
      try { updateData.faceRegistration = JSON.parse(updateData.faceRegistration); } catch (e) {}
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
    
    // Also update User record if avatar/profilePicture is being updated
    if (updateData.profilePicture?.url) {
      await User.findOneAndUpdate({ email: employee.email }, { avatar: updateData.profilePicture.url });
      console.log(`🖼️ User avatar also updated to:`, updateData.profilePicture.url);
    } else if (updateData.firstName || updateData.lastName) {
      const newName = `${updateData.firstName || employee.firstName} ${updateData.lastName || employee.lastName}`;
      await User.findOneAndUpdate({ email: employee.email }, { name: newName });
    }

    // Update face registration embedding if image is provided
    let faceBuffer = null;
    if (req.files && req.files.faceRegistration && req.files.faceRegistration[0]) {
      faceBuffer = fs.readFileSync(req.files.faceRegistration[0].path);
    }

    if ((updateData.faceRegistration && updateData.faceRegistration.faceImage) || faceBuffer) {
      try {
        await loadFaceModels();
        let buffer = faceBuffer;
        if (!buffer && updateData.faceRegistration.faceImage) {
           const base64Data = updateData.faceRegistration.faceImage.replace(/^data:image\/\w+;base64,/, "");
           buffer = Buffer.from(base64Data, 'base64');
        }
        const faceEmbedding = await detectFaceAndGetEmbedding(buffer);
        
        await User.findOneAndUpdate({ email: employee.email }, { 
          faceRegistered: true,
          faceEmbedding: faceEmbedding 
        });
        
        if (!updateData.faceRegistration) updateData.faceRegistration = {};
        updateData.faceRegistration.faceEmbedding = faceEmbedding;
        updateData.faceRegistration.isRegistered = true;
        
        console.log(`✅ Extracted and updated face embedding for existing employee`);
      } catch (err) {
        console.error('❌ Failed to update embedding from image:', err.message);
      }
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
    
    // First try to delete the User account (login credentials)
    const user = await User.findOneAndDelete({ id: id });
    
    // Then try to find and delete the employee record
    const employee = await db.findEmployeeById(id);

    if (!employee && !user) {
      const error = new Error('Employee/User not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if (employee) {
      await db.deleteEmployee(id);
    }

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

export const updateMyProfile = async (req, res) => {
  try {
    const email = req.user.email;
    const employee = await db.findEmployeeByEmail(email);

    if (!employee) {
      const error = new Error('Employee profile not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const { phone, address, dob, bloodGroup, emergencyContact, password, name } = req.body;

    const updateData = {};
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (dob !== undefined) updateData.dob = dob;
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    
    // Handle name update
    let newName = null;
    if (name && name.trim().length > 0) {
      newName = name.trim();
      const nameParts = newName.split(' ');
      updateData.firstName = nameParts[0];
      updateData.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    }

    // Handle avatar upload
    // Handle avatar upload (binary)
    let avatarUrl = null;
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      const file = req.files.avatar[0];
      const port = process.env.PORT || '5000';
      const baseUrl = `http://localhost:${port}`;
      avatarUrl = `${baseUrl}/uploads/employees/${file.filename}`;
      console.log(`📷 Profile picture uploaded:`, {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        url: avatarUrl,
      });
      updateData.profilePicture = {
        type: 'upload',
        url: avatarUrl,
      };
    }

    // Update Employee
    let updatedEmployee = employee;
    if (Object.keys(updateData).length > 0) {
      updatedEmployee = await db.updateEmployee(employee.id, updateData);
    }

    // Update User (password, name, avatar, face)
    const userUpdate = {};
    if (newName) userUpdate.name = newName;
    if (avatarUrl) userUpdate.avatar = avatarUrl;

    // Handle face registration binary upload
    let faceBuffer = null;
    if (req.files && req.files.faceRegistration && req.files.faceRegistration[0]) {
      faceBuffer = fs.readFileSync(req.files.faceRegistration[0].path);
      console.log('📷 Face binary uploaded for update');
    }
    if (faceBuffer) {
      try {
        await loadFaceModels();
        const faceEmbedding = await detectFaceAndGetEmbedding(faceBuffer);
        userUpdate.faceRegistered = true;
        userUpdate.faceEmbedding = faceEmbedding;
        console.log('✅ Updated face embedding for user');
      } catch (err) {
        console.error('❌ Failed to update face embedding:', err.message);
      }
    }

    if (password && password.trim().length > 0) {
      userUpdate.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(userUpdate).length > 0) {
      await User.findOneAndUpdate(
        { email: email },
        userUpdate
      );
    }

    res.status(200).json({
      success: true,
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
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
