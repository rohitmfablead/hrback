import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';

export const getDashboardStatistics = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'HR';
    const today = new Date().toISOString().split('T')[0];
    const currentDate = new Date();
    const timeframe = req.query.timeframe || 'today';
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    let startDate, endDate;
    if (timeframe === 'month') {
      startDate = new Date(currentYear, currentMonth, 1);
      endDate = new Date(currentYear, currentMonth + 1, 1);
    } else if (timeframe === 'year') {
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear + 1, 0, 1);
    } else { // today
      startDate = new Date();
      startDate.setHours(0,0,0,0);
      endDate = new Date();
      endDate.setHours(23,59,59,999);
    }

    // Upcoming birthdays (fetch all employees and match month)
    const allEmps = await Employee.find({ status: 'Active' });
    const upcomingBirthdays = allEmps.filter(emp => {
      const empDob = emp.dob ? new Date(emp.dob) : (emp.joiningDate ? new Date(emp.joiningDate) : null);
      if (!empDob) return false;
      return empDob.getMonth() === currentDate.getMonth();
    }).map(emp => ({ 
      id: emp.id || emp._id?.toString(),
      name: emp.firstName ? `${emp.firstName} ${emp.lastName}` : (emp.name || 'Employee'), 
      date: emp.dob || emp.joiningDate,
      department: emp.department,
      designation: emp.designation || 'Employee',
      avatar: emp.profilePicture?.url || null
    })).slice(0, 3);

    if (isAdmin) {
      // Admin/HR Dashboard
      const employees = await Employee.find();
      const activeEmployees = employees.filter(emp => emp.status === 'Active');
      
      const attendanceQuery = timeframe === 'today' ? { date: today } : { date: { $gte: startDate, $lt: endDate } };
      const periodAttendance = await Attendance.find(attendanceQuery);
      
      const pendingLeaves = await Leave.find({ status: 'Pending', createdAt: { $gte: startDate, $lt: endDate } });
      const payroll = await Payroll.find({ status: 'Paid', createdAt: { $gte: startDate, $lt: endDate } });

      const totalPayout = payroll.reduce((sum, p) => sum + p.netSalary, 0);

      const departmentStats = {};
      activeEmployees.forEach(emp => {
        departmentStats[emp.department] = (departmentStats[emp.department] || 0) + 1;
      });

      const recentActivities = [];
      const recentJoins = [...activeEmployees]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      recentJoins.forEach(emp => {
        recentActivities.push({ type: 'employee_joined', message: `${emp.name} joined ${emp.department}`, date: emp.joiningDate });
      });

      const recentLeaves = await Leave.find({ status: 'Approved' }).sort({ reviewedAt: -1 }).limit(5);
      recentLeaves.forEach(leave => {
        recentActivities.push({ type: 'leave_approved', message: `${leave.employeeName}'s leave approved`, date: leave.reviewedAt });
      });

      // Weekly Attendance Chart
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyAttendance = [];
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends
        const dateStr = date.toISOString().split('T')[0];
        const dayAttendance = await Attendance.find({ date: dateStr });
        weeklyAttendance.push({
          day: days[date.getDay()],
          date: dateStr,
          present: dayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length,
          absent: dayAttendance.filter(a => a.status === 'Absent').length,
        });
      }

      // Leave Overview Chart
      const approvedCount = await Leave.countDocuments({ status: 'Approved', createdAt: { $gte: startDate, $lt: endDate } });
      const pendingCount = await Leave.countDocuments({ status: 'Pending', createdAt: { $gte: startDate, $lt: endDate } });
      const rejectedCount = await Leave.countDocuments({ status: 'Rejected', createdAt: { $gte: startDate, $lt: endDate } });
      const leaveOverview = [
        { name: "Approved", value: approvedCount },
        { name: "Pending", value: pendingCount },
        { name: "Rejected", value: rejectedCount }
      ];

      const presentCount = periodAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
      
      // Rough attendance percentage for the period
      let attendancePercentage = 0;
      if (activeEmployees.length > 0) {
        if (timeframe === 'today') {
          attendancePercentage = Math.round((presentCount / activeEmployees.length) * 100);
        } else {
          // Approximate for month/year based on elapsed days (excluding weekends)
          const daysElapsed = Math.max(1, Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)));
          const workingDaysElapsed = daysElapsed * (5/7); // roughly 5 working days a week
          attendancePercentage = Math.round((presentCount / (activeEmployees.length * Math.max(1, workingDaysElapsed))) * 100);
          if (attendancePercentage > 100) attendancePercentage = 100;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          totalEmployees: employees.length,
          activeEmployees: activeEmployees.length,
          presentToday: presentCount,
          attendancePercentage,
          pendingLeaves: pendingLeaves.length,
          totalPayout,
          departmentStats: Object.entries(departmentStats).map(([name, count]) => ({ name, count })),
          recentActivities,
          weeklyAttendance,
          leaveOverview,
          upcomingBirthdays
        },
      });
    } else {
      // Employee Dashboard
      const employee = await Employee.findOne({ email: req.user.email });
      if (!employee) throw new Error('Employee profile not found');

      const attendanceQuery = timeframe === 'today' ? { date: today, employeeId: employee.id } : { employeeId: employee.id, date: { $gte: startDate, $lt: endDate } };
      const attendance = await Attendance.find(attendanceQuery);
      
      const presentCount = attendance.filter(a => a.status === 'Present').length;
      const absentCount = attendance.filter(a => a.status === 'Absent').length;
      const lateCount = attendance.filter(a => a.status === 'Late').length;
      const totalDays = attendance.length;

      // Today's hours
      const todayRecord = attendance.find(a => {
        const aDateStr = typeof a.date === 'string' ? a.date.split('T')[0] : new Date(a.date).toISOString().split('T')[0];
        return aDateStr === today;
      });
      let todayHours = "0h 0m";
      if (todayRecord && todayRecord.checkIn && todayRecord.checkOut) {
        const [inH, inM] = todayRecord.checkIn.split(':').map(Number);
        const [outH, outM] = todayRecord.checkOut.split(':').map(Number);
        let mins = (outH * 60 + outM) - (inH * 60 + inM);
        if (mins > 0) todayHours = `${Math.floor(mins / 60)}h ${mins % 60}m`;
      } else if (todayRecord && todayRecord.checkIn) {
        const [inH, inM] = todayRecord.checkIn.split(':').map(Number);
        const nowH = currentDate.getHours();
        const nowM = currentDate.getMinutes();
        let mins = (nowH * 60 + nowM) - (inH * 60 + inM);
        if (mins > 0) todayHours = `${Math.floor(mins / 60)}h ${mins % 60}m`;
      }

      const allLeaves = await Leave.find({ employeeId: employee.id });
      const myPendingLeaves = allLeaves.filter(l => l.status === 'Pending').length;
      const usedThisYear = {};
      const currentYearValue = currentYear; // From top of file
      allLeaves.filter(l => l.status === 'Approved').forEach(leave => {
        if (new Date(leave.fromDate).getFullYear() === currentYearValue) {
          usedThisYear[leave.leaveType] = (usedThisYear[leave.leaveType] || 0) + 1;
        }
      });

      const defaultBalances = { sickLeave: 7, casualLeave: 12, annualLeave: 20 };
      const leaveBalance = {};
      Object.keys(defaultBalances).forEach(type => {
        leaveBalance[type] = defaultBalances[type] - (usedThisYear[type] || 0);
      });

      const payroll = await Payroll.findOne({ employeeId: employee.id }).sort({ createdAt: -1 });
      const salaryStatus = payroll ? payroll.status : 'Pending';

      const upcomingHolidays = [
        { name: 'Holi', date: '2026-03-25' },
        { name: 'Diwali', date: '2026-11-15' },
      ];

      // Weekly Attendance (last 7 days for Employee)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyAttendance = [];
      for (let i = 6; i >= 0; i--) {
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() - i);
        const dateStr = dateObj.toISOString().split('T')[0];
        const dayRecord = attendance.find(a => {
          const aDateStr = typeof a.date === 'string' ? a.date.split('T')[0] : new Date(a.date).toISOString().split('T')[0];
          return aDateStr === dateStr;
        });
        let status = 'missing';
        if (dayRecord) {
          if (dayRecord.status === 'Present' || dayRecord.status === 'Late') status = 'present';
          else if (dayRecord.status === 'Absent') status = 'absent';
        }
        weeklyAttendance.push({
          date: dateStr,
          day: days[dateObj.getDay()],
          status,
          isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6
        });
      }

      res.status(200).json({
        success: true,
        data: {
          employeeName: employee.name,
          department: employee.department,
          attendanceThisMonth: {
            present: presentCount,
            absent: absentCount,
            late: lateCount,
            percentage: totalDays > 0 ? Math.round(((presentCount / totalDays) * 100)) : 0,
          },
          todayHours,
          leaveBalance,
          pendingLeaves: myPendingLeaves,
          salaryStatus,
          upcomingHolidays,
          upcomingBirthdays,
          weeklyAttendance, // <--- added
          recentLeaves: allLeaves.slice(0, 3),
          pendingTasks: [
            { id: 1, title: 'Submit weekly report', status: 'Pending' },
            { id: 2, title: 'Update client presentation', status: 'In Progress' }
          ]
        },
      });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const getChartData = async (req, res) => {
  // Legacy chart endpoint kept for compatibility if needed elsewhere
  try {
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
