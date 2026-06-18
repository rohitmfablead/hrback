import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  resume: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Applied', 'Shortlisted', 'Interview', 'Rejected'],
    default: 'Applied',
  }
}, {
  timestamps: true,
});

export default mongoose.model('Candidate', candidateSchema);
