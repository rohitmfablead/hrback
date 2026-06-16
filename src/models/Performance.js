import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  avatar: { type: String, required: true },
  department: { type: String, required: true },
  role: { type: String, required: true },
  overallRating: { type: Number, required: true },
  goals: {
    total: { type: Number, required: true },
    completed: { type: Number, required: true },
  },
  skills: [{
    name: { type: String, required: true },
    rating: { type: Number, required: true },
  }],
  lastReview: { type: String, required: true },
  nextReview: { type: String, required: true },
  achievements: [{ type: String }],
}, { timestamps: true });

performanceSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

const Performance = mongoose.model('Performance', performanceSchema);
export default Performance;
