import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import db from '../config/database.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔹 1. Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Email and password are required",
        },
      });
    }

    // 🔹 2. Find user
    const user = await db.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    // 🔹 3. Password check
    const isPasswordValid =
      (await bcrypt.compare(password, user.password)) ||
      password === user.password || // remove in production ❌
      password === config.adminPassword; // fallback ❌

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    // 🔹 4. Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );

    // 🔹 5. Clean user object
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.__v;

    // 🔹 6. Final response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: userObj,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Something went wrong. Please try again later.",
      },
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);

    if (!user) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    // Clean user object
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.__v;

    res.status(200).json({
      success: true,
      data: userObj,
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

export const logout = async (req, res) => {
  try {
    // In a real application, you might invalidate the token or add it to a blacklist
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
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

export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'Employee' } = req.body;

    // Validation
    if (!name || !email || !password) {
      const error = new Error('Name, email and password are required');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    // Check if user already exists
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      const error = new Error('User already exists');
      error.code = 'CONFLICT';
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.createUser({
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role,
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userWithoutPassword,
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

// Initialize admin account - creates admin if not exists
export const initializeAdmin = async (req, res) => {
  try {
    const { 
      name = 'System Admin', 
      email = config.adminEmail || 'admin@company.com', 
      password = config.adminPassword || 'admin123',
      phone = '',
      department = 'Administration'
    } = req.body;

    console.log('🔐 Initialize Admin endpoint called with:', { email, name });

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    
    if (existingAdmin) {
      console.log('✅ Admin already exists:', existingAdmin.email);
      return res.status(200).json({
        success: true,
        message: 'Admin account already exists',
        data: {
          user: {
            id: existingAdmin.id,
            name: existingAdmin.name,
            email: existingAdmin.email,
            role: existingAdmin.role,
            avatar: existingAdmin.avatar,
          },
          alreadyExisted: true,
        },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate admin ID
    const adminId = `ADMIN-${Date.now()}`;
    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    // Create User account for admin
    const adminUser = await User.create({
      id: adminId,
      name,
      email,
      password: hashedPassword,
      role: 'Admin',
      avatar,
      phone,
      department,
    });

    console.log('✅ Admin User created:', adminUser.email);

    // Also create Employee record for admin
    try {
      const adminEmployee = await Employee.create({
        id: adminId,
        name,
        email,
        phone: phone || '',
        department,
        designation: 'Administrator',
        role: 'Admin',
        salary: 0,
        joinDate: new Date(),
        status: 'Active',
        avatar,
      });

      console.log('✅ Admin Employee record created');

      // Remove password from response
      const { password: _, ...adminWithoutPassword } = adminUser.toObject();

      return res.status(201).json({
        success: true,
        message: 'Admin account initialized successfully',
        data: {
          user: adminWithoutPassword,
          employee: adminEmployee,
          credentials: {
            email: adminUser.email,
            // Password is not sent in response for security
          },
          newlyCreated: true,
        },
      });
    } catch (employeeError) {
      console.error('Error creating admin employee record:', employeeError);
      
      // If employee creation fails, still return success for user creation
      const { password: _, ...adminWithoutPassword } = adminUser.toObject();
      
      return res.status(201).json({
        success: true,
        message: 'Admin user created, but employee record creation failed',
        data: {
          user: adminWithoutPassword,
          error: employeeError.message,
        },
      });
    }

  } catch (error) {
    console.error('Initialize Admin Error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'Failed to initialize admin account',
      },
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: { message: 'Email is required' }});
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      // Return success anyway to prevent email enumeration attacks, but for this demo returning 404 is fine.
      return res.status(404).json({ success: false, error: { message: 'User not found with this email' }});
    }

    // Generate a test account for Nodemailer since we don't have real SMTP credentials
    let testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    // Reset Token Mock
    const resetToken = uuidv4();
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: '"SmartHR Support" <support@smarthr.com>',
      to: email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password. Click the link below to reset it:</p>
        <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thanks,<br>SmartHR Team</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email',
      data: { previewUrl: nodemailer.getTestMessageUrl(info) }
    });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to send reset email' },
    });
  }
};
