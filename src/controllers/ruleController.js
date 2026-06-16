import Rule from '../models/Rule.js';

export const getRules = async (req, res) => {
  try {
    const rules = await Rule.find().sort({ lastUpdated: -1 });
    res.status(200).json({ success: true, data: { rules } });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const createRule = async (req, res) => {
  try {
    const rule = await Rule.create(req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const updateRule = async (req, res) => {
  try {
    const rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) throw new Error('Rule not found');
    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findByIdAndDelete(req.params.id);
    if (!rule) throw new Error('Rule not found');
    res.status(200).json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
