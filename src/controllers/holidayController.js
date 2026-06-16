import Holiday from '../models/Holiday.js';

export const getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.status(200).json({ success: true, data: { holidays } });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.create(req.body);
    res.status(201).json({ success: true, data: holiday });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!holiday) throw new Error('Holiday not found');
    res.status(200).json({ success: true, data: holiday });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) throw new Error('Holiday not found');
    res.status(200).json({ success: true, message: 'Holiday deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
