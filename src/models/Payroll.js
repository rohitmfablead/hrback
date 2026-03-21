import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
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
  month: {
    type: String,
    required: true,
  },
  basicSalary: {
    type: Number,
    default: 0,
  },
  bonus: {
    type: Number,
    default: 0,
  },
  deductions: {
    type: Number,
    default: 0,
  },
  netSalary: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending',
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  paidAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

const Payroll = mongoose.model('Payroll', payrollSchema);

export default Payroll;
