import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DB_PATH);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional)
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Create test users
    const users = [
      {
        id: 'admin-001',
        name: 'Admin User',
        email: 'admin@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Admin',
        avatar: 'AU',
        phone: '+91 9876543210',
        department: 'IT',
      },
      {
        id: 'hr-001',
        name: 'HR Manager',
        email: 'hr@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'HR',
        avatar: 'HR',
        phone: '+91 9876543211',
        department: 'Human Resources',
      },
      {
        id: 'emp-001',
        name: 'Rahul Sharma',
        email: 'rahul@company.com',
        password: await bcrypt.hash('password123', 10),
        role: 'Employee',
        avatar: 'RS',
        phone: '+91 9876543212',
        department: 'Engineering',
      },
    ];

    // Insert users
    const createdUsers = await User.insertMany(users);
    console.log('✅ Created test users:');
    createdUsers.forEach(user => {
      console.log(`  - ${user.role}: ${user.email} / password123`);
    });

    console.log('\n🎉 Test users created successfully!');
    console.log('\nYou can now login with:');
    console.log('  Admin:     admin@company.com / password123');
    console.log('  HR:        hr@company.com / password123');
    console.log('  Employee:  rahul@company.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createTestUsers();
