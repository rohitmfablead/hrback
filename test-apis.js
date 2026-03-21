/**
 * API Test Script for Emp Care Circle Backend
 * Tests all major endpoints including face recognition
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Test credentials
const testUsers = {
  admin: {
    email: 'admin@company.com',
    password: 'admin123',
    role: 'Admin'
  },
 
};

let tokens = {};

async function testAPI() {
  console.log('🧪 Starting API Tests...\n');

  try {
    // Test 1: Login as Admin
    console.log('Test 1: Admin Login');
    const adminLogin = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUsers.admin)
    });
    const adminData = await adminLogin.json();
    
    if (adminData.success) {
      tokens.admin = adminData.data.token;
      console.log('✅ Admin login successful\n');
    } else {
      console.log('❌ Admin login failed:', adminData.error?.message, '\n');
    }

    // Test 2: Login as Employee
    console.log('Test 2: Employee Login');
    const empLogin = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUsers.employee)
    });
    const empData = await empLogin.json();
    
    if (empData.success) {
      tokens.employee = empData.data.token;
      console.log('✅ Employee login successful\n');
    } else {
      console.log('❌ Employee login failed:', empData.error?.message, '\n');
    }

    // Test 3: Mark Attendance with Face Recognition
    console.log('Test 3: Mark Attendance with Face Recognition');
    const faceAttendance = await fetch(`${API_BASE_URL}/attendance/face/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.employee}`
      },
      body: JSON.stringify({
        employeeId: '1',
        checkIn: '09:15',
        faceImage: null // Can add base64 image here
      })
    });
    const faceData = await faceAttendance.json();
    
    if (faceData.success || faceData.error?.code === 'CONFLICT') {
      console.log('✅ Face recognition attendance endpoint working');
      if (faceData.error?.code === 'CONFLICT') {
        console.log('   Note: Attendance already marked for today\n');
      } else {
        console.log('   Response:', faceData.message, '\n');
      }
    } else {
      console.log('❌ Face recognition failed:', faceData.error?.message, '\n');
    }

    // Test 4: Get Today's Attendance
    console.log('Test 4: Get Today\'s Attendance Status');
    const todayStatus = await fetch(`${API_BASE_URL}/attendance/today`, {
      headers: {
        'Authorization': `Bearer ${tokens.employee}`
      }
    });
    const todayData = await todayStatus.json();
    
    if (todayData.success) {
      console.log('✅ Today\'s status retrieved');
      console.log('   Marked:', todayData.data.marked);
      if (todayData.data.attendance) {
        console.log('   Check-in:', todayData.data.attendance.checkIn);
        console.log('   Status:', todayData.data.attendance.status, '\n');
      } else {
        console.log('   No attendance record for today\n');
      }
    } else {
      console.log('❌ Failed to get today\'s status:', todayData.error?.message, '\n');
    }

    // Test 5: Get My Attendance
    console.log('Test 5: Get My Attendance Records');
    const myAttendance = await fetch(`${API_BASE_URL}/attendance/my?month=3&year=2026`, {
      headers: {
        'Authorization': `Bearer ${tokens.employee}`
      }
    });
    const attendanceData = await myAttendance.json();
    
    if (attendanceData.success) {
      console.log('✅ Attendance records retrieved');
      console.log('   Total records:', attendanceData.data.attendance?.length || 0);
      console.log('   Summary:', attendanceData.data.summary, '\n');
    } else {
      console.log('❌ Failed to get attendance:', attendanceData.error?.message, '\n');
    }

    // Test 6: Get Attendance Statistics
    console.log('Test 6: Get Attendance Statistics');
    const stats = await fetch(`${API_BASE_URL}/attendance/stats`, {
      headers: {
        'Authorization': `Bearer ${tokens.admin}`
      }
    });
    const statsData = await stats.json();
    
    if (statsData.success) {
      console.log('✅ Statistics retrieved');
      console.log('   Total Employees:', statsData.data.totalEmployees);
      console.log('   Present Today:', statsData.data.presentToday);
      console.log('   Attendance %:', statsData.data.attendancePercentage, '\n');
    } else {
      console.log('❌ Failed to get statistics:', statsData.error?.message, '\n');
    }

    // Test 7: Get All Employees (Admin only)
    console.log('Test 7: Get All Employees');
    const employees = await fetch(`${API_BASE_URL}/employees`, {
      headers: {
        'Authorization': `Bearer ${tokens.admin}`
      }
    });
    const empList = await employees.json();
    
    if (empList.success) {
      console.log('✅ Employee list retrieved');
      console.log('   Total employees:', empList.data.employees?.length || 0, '\n');
    } else {
      console.log('❌ Failed to get employees:', empList.error?.message, '\n');
    }

    // Test 8: Permission Test - Employee trying to access all attendance
    console.log('Test 8: Permission Test (Employee accessing all attendance)');
    const allAttendance = await fetch(`${API_BASE_URL}/attendance`, {
      headers: {
        'Authorization': `Bearer ${tokens.employee}`
      }
    });
    const allData = await allAttendance.json();
    
    if (!allData.success && allData.error?.code === 'FORBIDDEN') {
      console.log('✅ Permission check passed - Employee correctly denied access\n');
    } else if (allData.success) {
      console.log('⚠️  Permission issue - Employee should not have access to all attendance\n');
    } else {
      console.log('❌ Unexpected error:', allData.error?.message, '\n');
    }

    
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    console.error('Make sure backend server is running on http://localhost:5000');
  }
}

// Run tests
testAPI();
