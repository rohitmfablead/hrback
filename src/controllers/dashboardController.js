import db from '../config/database.js';

export const getDashboardStatistics = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'HR';

    if (isAdmin) {
      // Admin/HR Dashboard
      const employees = db.findAll('employees').filter(e => e.status === 'Active');
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = db.findByQuery('attendance', a => a.date === today);
      const pendingLeaves = db.findByQuery('leaves', l => l.status === 'Pending');
      const payroll = db.findAll('payroll');

      // Calculate total payout (paid salaries)
      const totalPayout = payroll
        .filter(p => p.status === 'Paid')
        .reduce((sum, p) => sum + p.netSalary, 0);

      // Department statistics
      const departmentStats = {};
      employees.forEach(emp => {
        departmentStats[emp.department] = (departmentStats[emp.department] || 0) + 1;
      });

      const recentActivities = [];
      
      // Get recent employee joins
      const recentJoins = employees
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      recentJoins.forEach(emp => {
        recentActivities.push({
          type: 'employee_joined',
          message: `${emp.name} joined ${emp.department}`,
          date: emp.joiningDate,
        });
      });

      // Get recent leave approvals
      const recentLeaves = db.findAll('leaves')
        .filter(l => l.status === 'Approved')
        .sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt))
        .slice(0, 5);
      recentLeaves.forEach(leave => {
        recentActivities.push({
          type: 'leave_approved',
          message: `${leave.employeeName}'s leave approved`,
          date: leave.reviewedAt,
        });
      });

      res.status(200).json({
        success: true,
        data: {
          totalEmployees: employees.length,
          activeEmployees: employees.length,
          presentToday: todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length,
          attendancePercentage: employees.length > 0 
            ? Math.round(((todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / employees.length) * 100))
            : 0,
          pendingLeaves: pendingLeaves.length,
          totalPayout,
          departmentStats: Object.entries(departmentStats).map(([name, count]) => ({ name, count })),
          recentActivities,
        },
      });
    } else {
      // Employee Dashboard
      const employee = db.findOne('employees', e => e.email === req.user.email);
      if (!employee) {
        const error = new Error('Employee profile not found');
        error.code = 'NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }

      // Get attendance for current month
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const attendance = db.findByQuery('attendance', a => {
        const aDate = new Date(a.date);
        return a.employeeId === employee.id && 
               aDate.getMonth() + 1 === currentMonth && 
               aDate.getFullYear() === currentYear;
      });

      const presentCount = attendance.filter(a => a.status === 'Present').length;
      const absentCount = attendance.filter(a => a.status === 'Absent').length;
      const lateCount = attendance.filter(a => a.status === 'Late').length;
      const totalDays = attendance.length;

      // Get leave balance
      const allLeaves = db.findByQuery('leaves', l => l.employeeId === employee.id && l.status === 'Approved');
      const usedThisYear = {};
      allLeaves.forEach(leave => {
        const leaveYear = new Date(leave.fromDate).getFullYear();
        if (leaveYear === currentYear) {
          usedThisYear[leave.leaveType] = (usedThisYear[leave.leaveType] || 0) + 1;
        }
      });

      const defaultBalances = {
        sickLeave: 7,
        casualLeave: 12,
        annualLeave: 20,
      };

      const leaveBalance = {};
      Object.keys(defaultBalances).forEach(type => {
        leaveBalance[type] = defaultBalances[type] - (usedThisYear[type] || 0);
      });

      // Upcoming holidays (mock data)
      const upcomingHolidays = [
        { name: 'Holi', date: '2026-03-25' },
        { name: 'Diwali', date: '2026-11-15' },
      ];

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
          leaveBalance,
          upcomingHolidays,
        },
      });
    }
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    throw error;
  }
};

export const getChartData = async (req, res) => {
  try {
    const { type, period = 'week' } = req.query;

    if (!type) {
      const error = new Error('Chart type is required');
      error.code = 'VALIDATION_ERROR';
      error.statusCode = 400;
      throw error;
    }

    const data = {};

    if (type === 'attendance') {
      // Attendance chart data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const attendanceData = [];
      
      for (let i = (period === 'week' ? 4 : period === 'month' ? 29 : 364); i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        if (period === 'week' && date.getDay() === 0) continue; // Skip Sundays for week view
        
        const dayAttendance = db.findByQuery('attendance', a => a.date === dateStr);
        
        attendanceData.push({
          day: days[date.getDay()],
          date: dateStr,
          present: dayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length,
          absent: dayAttendance.filter(a => a.status === 'Absent').length,
        });
      }

      data.attendanceChart = attendanceData;
    } else if (type === 'leave') {
      // Leave chart data
      const allLeaves = db.findAll('leaves');
      const leaveStats = {
        Approved: allLeaves.filter(l => l.status === 'Approved').length,
        Pending: allLeaves.filter(l => l.status === 'Pending').length,
        Rejected: allLeaves.filter(l => l.status === 'Rejected').length,
      };

      data.leaveChart = Object.entries(leaveStats).map(([name, value]) => ({ name, value }));
    } else if (type === 'payroll') {
      // Payroll chart data
      const allPayroll = db.findAll('payroll');
      const payrollStats = {
        Paid: allPayroll.filter(p => p.status === 'Paid').length,
        Pending: allPayroll.filter(p => p.status === 'Pending').length,
      };

      data.payrollChart = Object.entries(payrollStats).map(([name, value]) => ({ name, value }));
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    throw error;
  }
};
