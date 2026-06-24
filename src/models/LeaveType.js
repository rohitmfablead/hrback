import mongoose from 'mongoose';

const leaveTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);

export default LeaveType;
