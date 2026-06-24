import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

// To ensure no duplicate designation title within the same department
designationSchema.index({ title: 1, departmentId: 1 }, { unique: true });

const Designation = mongoose.model('Designation', designationSchema);

export default Designation;
