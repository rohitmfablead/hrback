import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ["Management", "Work Environment", "Benefits", "Career Growth", "Team Collaboration", "Other"], required: true },
  title: { type: String, required: true },
  suggestion: { type: String, required: true },
  rating: { type: Number, required: true },
  submittedBy: { type: String, required: true },
  status: { type: String, enum: ["Received", "Acknowledged", "In Progress", "Implemented"], default: "Received" },
  createdAt: { type: String, default: () => new Date().toISOString().split('T')[0] },
}, { timestamps: true });

feedbackSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;
