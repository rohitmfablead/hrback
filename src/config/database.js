import mongoose from 'mongoose';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';
import Notification from '../models/Notification.js';

// MongoDB-based database operations
class Database {
  constructor() {
    this.models = {
      User,
      Employee,
      Attendance,
      Leave,
      Payroll,
      Notification,
    };
  }

  // User operations
  async findUserByEmail(email) {
    return await User.findOne({ email });
  }

  async findUserById(id) {
    return await User.findOne({ id });
  }

  async createUser(userData) {
    const user = new User(userData);
    await user.save();
    return user;
  }

  async updateUser(id, updateData) {
    return await User.findOneAndUpdate({ id }, updateData, { new: true });
  }

  async deleteUser(id) {
    return await User.findOneAndDelete({ id });
  }

  // Employee operations
  async findAllEmployees(query = {}, options = {}) {
    return await Employee.find(query, null, options);
  }

  async findEmployeeById(id) {
    return await Employee.findOne({ id });
  }

  async findEmployeeByEmail(email) {
    return await Employee.findOne({ email });
  }

  async createEmployee(employeeData) {
    const employee = new Employee(employeeData);
    await employee.save();
    return employee;
  }

  async updateEmployee(id, updateData) {
    return await Employee.findOneAndUpdate({ id }, updateData, { new: true });
  }

  async deleteEmployee(id) {
    return await Employee.findOneAndDelete({ id });
  }

  // Attendance operations
  async findAllAttendance(query = {}) {
    return await Attendance.find(query);
  }

  async findAttendanceById(id) {
    return await Attendance.findOne({ id });
  }

  async createAttendance(attendanceData) {
    const attendance = new Attendance(attendanceData);
    await attendance.save();
    return attendance;
  }

  async updateAttendance(id, updateData) {
    return await Attendance.findOneAndUpdate({ id }, updateData, { new: true });
  }

  async deleteAttendance(id) {
    return await Attendance.findOneAndDelete({ id });
  }

  // Leave operations
  async findAllLeaves(query = {}) {
    return await Leave.find(query);
  }

  async findLeaveById(id) {
    return await Leave.findOne({ id });
  }

  async createLeave(leaveData) {
    const leave = new Leave(leaveData);
    await leave.save();
    return leave;
  }

  async updateLeave(id, updateData) {
    return await Leave.findOneAndUpdate({ id }, updateData, { new: true });
  }

  async deleteLeave(id) {
    return await Leave.findOneAndDelete({ id });
  }

  // Payroll operations
  async findAllPayroll(query = {}) {
    return await Payroll.find(query);
  }

  async findPayrollById(id) {
    return await Payroll.findOne({ id });
  }

  async createPayroll(payrollData) {
    const payroll = new Payroll(payrollData);
    await payroll.save();
    return payroll;
  }

  async updatePayroll(id, updateData) {
    return await Payroll.findOneAndUpdate({ id }, updateData, { new: true });
  }

  async deletePayroll(id) {
    return await Payroll.findOneAndDelete({ id });
  }

  // Notification operations
  async findAllNotifications(query = {}) {
    return await Notification.find(query);
  }

  async findNotificationById(id) {
    return await Notification.findOne({ id });
  }

  async createNotification(notificationData) {
    const notification = new Notification(notificationData);
    await notification.save();
    return notification;
  }

  async updateNotification(id, updateData) {
    return await Notification.findOneAndUpdate({ id }, updateData, { new: true });
  }

  async deleteNotification(id) {
    return await Notification.findOneAndDelete({ id });
  }

  async deleteAllNotifications() {
    return await Notification.deleteMany({});
  }
}

export default new Database();
