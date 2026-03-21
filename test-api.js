// Test API Script for Emp Care Circle Backend
// Run with: node test-api.js

const API_URL = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🧪 Testing Emp Care Circle API...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthRes = await fetch(`${API_URL}/health`);
    const health = await healthRes.json();
    console.log('✓ Health:', health.success ? 'PASS' : 'FAIL');

    // Test 2: Login
    console.log('\n2. Testing Login...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@company.com',
        password: 'admin123'
      })
    });
    const login = await loginRes.json();
    console.log('✓ Login:', login.success ? 'PASS' : 'FAIL');
    
    if (!login.success) {
      console.error('Login failed, stopping tests');
      return;
    }

    const token = login.data.token;
    console.log('Token received:', token.substring(0, 50) + '...');

    // Test 3: Get Current User
    console.log('\n3. Testing Get Current User...');
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const me = await meRes.json();
    console.log('✓ Get User:', me.success ? 'PASS' : 'FAIL');
    if (me.success) {
      console.log('User:', me.data.name, '(', me.data.role, ')');
    }

    // Test 4: Get Dashboard Stats
    console.log('\n4. Testing Dashboard Statistics...');
    const dashboardRes = await fetch(`${API_URL}/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dashboard = await dashboardRes.json();
    console.log('✓ Dashboard:', dashboard.success ? 'PASS' : 'FAIL');
    if (dashboard.success) {
      console.log('Total Employees:', dashboard.data.totalEmployees);
      console.log('Present Today:', dashboard.data.presentToday);
    }

    // Test 5: Create Employee
    console.log('\n5. Testing Create Employee...');
    const createEmpRes = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Employee',
        email: 'test@company.com',
        phone: '+91 9876543210',
        department: 'Engineering',
        role: 'Developer',
        salary: 50000,
        joiningDate: '2026-03-20',
        status: 'Active'
      })
    });
    const createEmp = await createEmpRes.json();
    console.log('✓ Create Employee:', createEmp.success ? 'PASS' : 'FAIL');
    
    let employeeId = null;
    if (createEmp.success) {
      employeeId = createEmp.data.id;
      console.log('Employee created with ID:', employeeId);
    }

    // Test 6: Get All Employees
    console.log('\n6. Testing Get All Employees...');
    const employeesRes = await fetch(`${API_URL}/employees`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const employees = await employeesRes.json();
    console.log('✓ Get Employees:', employees.success ? 'PASS' : 'FAIL');
    if (employees.success) {
      console.log('Total employees:', employees.data.employees.length);
    }

    // Test 7: Mark Attendance
    console.log('\n7. Testing Mark Attendance...');
    if (employeeId) {
      const attendanceRes = await fetch(`${API_URL}/attendance/mark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: employeeId,
          checkIn: '09:00',
          checkOut: '18:00'
        })
      });
      const attendance = await attendanceRes.json();
      console.log('✓ Mark Attendance:', attendance.success ? 'PASS' : 'FAIL');
    } else {
      console.log('⊘ Skipped (no employee ID)');
    }

    // Test 8: Apply for Leave
    console.log('\n8. Testing Apply for Leave...');
    const leaveRes = await fetch(`${API_URL}/leaves/apply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        leaveType: 'Sick Leave',
        fromDate: '2026-03-25',
        toDate: '2026-03-26',
        reason: 'Not feeling well'
      })
    });
    const leave = await leaveRes.json();
    console.log('✓ Apply Leave:', leave.success ? 'PASS' : 'FAIL');

    // Test 9: Get Notifications
    console.log('\n9. Testing Get Notifications...');
    const notificationsRes = await fetch(`${API_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const notifications = await notificationsRes.json();
    console.log('✓ Get Notifications:', notifications.success ? 'PASS' : 'FAIL');

    // Test 10: Logout
    console.log('\n10. Testing Logout...');
    const logoutRes = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const logout = await logoutRes.json();
    console.log('✓ Logout:', logout.success ? 'PASS' : 'FAIL');

    console.log('\n✅ All tests completed!\n');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testAPI();
