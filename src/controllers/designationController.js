import Designation from '../models/Designation.js';

export const getDesignations = async (req, res) => {
  try {
    // Populate department to get department details alongside
    const designations = await Designation.find().populate('departmentId');
    res.status(200).json(designations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDesignationById = async (req, res) => {
  try {
    const designation = await Designation.findById(req.params.id).populate('departmentId');
    if (!designation) return res.status(404).json({ message: 'Designation not found' });
    res.status(200).json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDesignationsByDepartment = async (req, res) => {
  try {
    const designations = await Designation.find({ departmentId: req.params.departmentId });
    res.status(200).json(designations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDesignation = async (req, res) => {
  try {
    const newDesignation = new Designation(req.body);
    const savedDesignation = await newDesignation.save();
    res.status(201).json(savedDesignation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDesignation = async (req, res) => {
  try {
    const updatedDesignation = await Designation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedDesignation) return res.status(404).json({ message: 'Designation not found' });
    res.status(200).json(updatedDesignation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteDesignation = async (req, res) => {
  try {
    const deletedDesignation = await Designation.findByIdAndDelete(req.params.id);
    if (!deletedDesignation) return res.status(404).json({ message: 'Designation not found' });
    res.status(200).json({ message: 'Designation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
