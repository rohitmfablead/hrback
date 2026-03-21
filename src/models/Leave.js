import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  employeeId: {
    type: String,
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
  },
  leaveType: {
    type: String,
    required: true,
  },
  fromDate: {
    type: Date,
    required: true,
  },
  toDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  reviewedBy: {
    type: String,
  },
  reviewedAt: {
    type: Date,
  },
  remarks: {
    type: String,
  },
}, {
  timestamps: true,
});

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;
