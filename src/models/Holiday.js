import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: String, required: true },
  day: { type: String, required: true },
  type: { type: String, enum: ['Public', 'Optional', 'Restricted'], default: 'Public' },
  description: { type: String }
}, { timestamps: true });

holidaySchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
  }
});

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;
