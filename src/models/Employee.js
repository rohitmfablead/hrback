import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
  },
  department: {
    type: String,
    required: true,
  },
  designation: {
    type: String,
  },
  role: {
    type: String,
    required: true,
  },
  salary: {
    type: Number,
    default: 0,
  },
  joiningDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  profilePicture: {
    type: {
      type: String,
      enum: ['upload', 'url', 'none'],
      default: 'upload'
    },
    url: {
      type: String,
      default: ''
    }
  },
  address: {
    type: String,
    default: ''
  },
  dob: {
    type: Date,
  },
  bloodGroup: {
    type: String,
    default: ''
  },
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relation: { type: String, default: '' }
  },
  faceRegistration: {
    isRegistered: { type: Boolean, default: false },
    faceImage: { type: String, default: '' },
    faceEmbedding: { type: [Number], default: [] },
    registeredAt: { type: Date }
  },
}, {
  timestamps: true,
});

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
