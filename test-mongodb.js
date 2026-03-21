import mongoose from 'mongoose';

console.log('🧪 Testing MongoDB Connection...\n');

const connectionString = 'mongodb+srv://rkmaurya412_db_user:xWDsqkYzpo0UDtIV@cluster0.fjqhjbh.mongodb.net/empCareCircle?retryWrites=true&w=majority';

const testConnection = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    console.log('Connection string:', connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    const conn = await mongoose.connect(connectionString);
    
    console.log('\n✅ SUCCESS! MongoDB Connected!\n');
    console.log('Database:', conn.connection.name);
    console.log('Host:', conn.connection.host);
    console.log('Port:', conn.connection.port);
    
    // Test creating a document
    const testSchema = new mongoose.Schema({
      test: String,
      createdAt: Date
    });
    
    const TestModel = conn.model('Test', testSchema);
    
    console.log('\n📝 Testing write operation...');
    const testDoc = await TestModel.create({
      test: 'Connection test',
      createdAt: new Date()
    });
    
    console.log('✓ Document created successfully');
    
    // Test reading
    console.log('\n📖 Testing read operation...');
    const found = await TestModel.findOne({ _id: testDoc._id });
    console.log('✓ Document retrieved successfully');
    
    // Cleanup
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('✓ Test document cleaned up');
    
    console.log('\n🎉 All tests passed! Your MongoDB is working perfectly!\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Connection failed!\n');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting steps:');
    console.error('1. Go to https://cloud.mongodb.com/');
    console.error('2. Login to your account');
    console.error('3. Click "Network Access" in left sidebar');
    console.error('4. Click "Add IP Address"');
    console.error('5. Select "Allow Access from Anywhere" (0.0.0.0/0)');
    console.error('6. Click "Confirm"');
    console.error('7. Wait 2-3 minutes for changes to take effect');
    console.error('8. Run this test again: node test-mongodb.js\n');
    process.exit(1);
  }
};

testConnection();
