import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  type: { type: String, enum: ["Harassment", "Discrimination", "Workplace Issue", "Policy Violation", "Other"], required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Under Review", "Resolved", "Closed"], default: "Pending" },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], required: true },
  reportedBy: { type: String, required: true },
  reportedAgainst: { type: String },
  isAnonymous: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString().split('T')[0] },
  updatedAt: { type: String },
}, { timestamps: true });

complaintSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
