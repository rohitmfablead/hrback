// Test script for Initialize Admin API
// Run this with: node test-initialize-admin.js

const API_URL = 'http://localhost:5000/api/auth/initialize-admin';

async function testInitializeAdmin() {
  try {
    console.log('🚀 Testing Initialize Admin API...\n');

    // Test 1: Call without any data (uses defaults)
    console.log('📝 Test 1: Creating admin with default values...');
    const response1 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data1 = await response1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));
    console.log('✅ Test 1 Complete\n');

    // Test 2: Call with custom admin details
    console.log('📝 Test 2: Creating admin with custom details...');
    const response2 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john.doe@company.com',
        password: 'securepass123',
        phone: '+91 9876543210',
        department: 'IT',
      }),
    });

    const data2 = await response2.json();
    console.log('Response:', JSON.stringify(data2, null, 2));
    console.log('✅ Test 2 Complete\n');

    // Test 3: Try to create again with same email (should return already exists)
    console.log('📝 Test 3: Trying to create admin with same email again...');
    const response3 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john.doe@company.com',
        password: 'securepass123',
      }),
    });

    const data3 = await response3.json();
    console.log('Response:', JSON.stringify(data3, null, 2));
    console.log('✅ Test 3 Complete\n');

    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testInitializeAdmin();
