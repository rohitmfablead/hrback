import Performance from '../models/Performance.js';

export const getPerformances = async (req, res) => {
  try {
    const performances = await Performance.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { performances } });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const createPerformance = async (req, res) => {
  try {
    const performance = await Performance.create(req.body);
    res.status(201).json({ success: true, data: performance });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const updatePerformance = async (req, res) => {
  try {
    const performance = await Performance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!performance) throw new Error('Performance not found');
    res.status(200).json({ success: true, data: performance });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const deletePerformance = async (req, res) => {
  try {
    const performance = await Performance.findByIdAndDelete(req.params.id);
    if (!performance) throw new Error('Performance not found');
    res.status(200).json({ success: true, message: 'Performance deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
