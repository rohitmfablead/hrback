import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema({
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  documentUrl: { type: String },
  lastUpdated: { type: String, required: true, default: () => new Date().toISOString().split('T')[0] },
}, { timestamps: true });

ruleSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

const Rule = mongoose.model('Rule', ruleSchema);
export default Rule;
