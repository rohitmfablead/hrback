import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['General', 'Urgent', 'Event', 'Policy'], required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString().split('T')[0] },
  expiresAt: { type: String },
  isPinned: { type: Boolean, default: false },
  targetAudience: { type: String, enum: ['All', 'Admin', 'HR', 'Employee'], required: true },
}, { timestamps: true });

announcementSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
