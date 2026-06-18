import Feedback from '../models/Feedback.js';

export const getFeedback = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Employee') {
      query.userId = req.user._id;
    }
    const feedbacks = await Feedback.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { feedbacks } });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const createFeedback = async (req, res) => {
  try {
    const feedbackData = {
      ...req.body,
      userId: req.user._id,
      submittedBy: req.user.name,
    };
    const feedback = await Feedback.create(feedbackData);
    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const updateFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!feedback) throw new Error('Feedback not found');
    res.status(200).json({ success: true, data: feedback });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) throw new Error('Feedback not found');
    res.status(200).json({ success: true, message: 'Feedback deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
