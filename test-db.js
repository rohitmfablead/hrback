import config from './src/config/index.js';
import mongoose from 'mongoose';
import Attendance from './src/models/Attendance.js';

async function test() {
  await mongoose.connect(config.dbPath);
  const attendances = await Attendance.find({});
  console.log('Attendances:', attendances);
  process.exit(0);
}

test();

test();
