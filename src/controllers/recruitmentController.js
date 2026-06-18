import Job from '../models/Job.js';
import Candidate from '../models/Candidate.js';

// --- Jobs ---

export const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).populate('createdBy', 'name');
    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const createJob = async (req, res) => {
  try {
    const { title, department, description, status } = req.body;
    const job = await Job.create({
      title,
      department,
      description,
      status: status || 'Open',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ success: false, error: { message: 'Job not found' } });
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findByIdAndDelete(id);
    if (!job) return res.status(404).json({ success: false, error: { message: 'Job not found' } });
    // Also delete associated candidates
    await Candidate.deleteMany({ jobId: id });
    res.status(200).json({ success: true, message: 'Job deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

// --- Candidates ---

export const getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: candidates });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const createCandidate = async (req, res) => {
  try {
    const { name, jobId, resume, status } = req.body;
    const candidate = await Candidate.create({
      name,
      jobId,
      resume: resume || 'resume_placeholder.pdf',
      status: status || 'Applied',
    });
    res.status(201).json({ success: true, data: candidate });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const updateCandidateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const candidate = await Candidate.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!candidate) return res.status(404).json({ success: false, error: { message: 'Candidate not found' } });
    res.status(200).json({ success: true, data: candidate });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findByIdAndDelete(id);
    if (!candidate) return res.status(404).json({ success: false, error: { message: 'Candidate not found' } });
    res.status(200).json({ success: true, message: 'Candidate deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
