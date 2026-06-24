import LeaveType from '../models/LeaveType.js';

// @desc    Get all leave types
// @route   GET /api/leave-types
// @access  Public
export const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find({});
    res.json(leaveTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new leave type
// @route   POST /api/leave-types
// @access  Public
export const createLeaveType = async (req, res) => {
  try {
    const { name, description } = req.body;
    const leaveTypeExists = await LeaveType.findOne({ name });

    if (leaveTypeExists) {
      return res.status(400).json({ message: 'Leave type already exists' });
    }

    const leaveType = await LeaveType.create({ name, description });
    res.status(201).json(leaveType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update leave type
// @route   PUT /api/leave-types/:id
// @access  Public
export const updateLeaveType = async (req, res) => {
  try {
    const { name, description } = req.body;
    const leaveType = await LeaveType.findById(req.params.id);

    if (leaveType) {
      leaveType.name = name || leaveType.name;
      leaveType.description = description !== undefined ? description : leaveType.description;

      const updatedLeaveType = await leaveType.save();
      res.json(updatedLeaveType);
    } else {
      res.status(404).json({ message: 'Leave type not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete leave type
// @route   DELETE /api/leave-types/:id
// @access  Public
export const deleteLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.findById(req.params.id);

    if (leaveType) {
      await leaveType.deleteOne();
      res.json({ message: 'Leave type removed' });
    } else {
      res.status(404).json({ message: 'Leave type not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
