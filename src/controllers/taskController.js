import Task from '../models/Task.js';
import Employee from '../models/Employee.js';

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req, res) => {
  try {
    const { role, email } = req.user;
    let query = {};

    // If user is a regular employee, only fetch tasks assigned to them
    if (role === 'Employee') {
      const employee = await Employee.findOne({ email });
      if (employee) {
        query.assignedTo = employee._id;
      } else {
        query.assignedTo = null; // No employee doc found
      }
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName avatar department designation')
      .populate('assignedBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { tasks } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private (Admin/HR)
export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;
    
    if (!title || !assignedTo || !dueDate) {
      return res.status(400).json({ success: false, message: 'Please provide required fields' });
    }

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: req.user._id,
      priority: priority || 'Medium',
      dueDate,
    });

    const populatedTask = await Task.findById(task._id).populate('assignedTo', 'firstName lastName');

    res.status(201).json({ success: true, data: { task: populatedTask } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Verify if user is employee, they can only update their own task status
    if (req.user.role === 'Employee') {
      const employee = await Employee.findOne({ email: req.user.email });
      if (!employee || task.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
      }
      
      // Employees can only update status
      const { status } = req.body;
      if (status) {
        task.status = status;
        await task.save();
      }
    } else {
      // Admin/HR can update anything
      const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      return res.status(200).json({ success: true, data: { task: updatedTask } });
    }

    res.status(200).json({ success: true, data: { task } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private (Admin/HR)
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await task.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
