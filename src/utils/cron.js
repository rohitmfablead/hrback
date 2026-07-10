import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';

// Auto-mark absent job: runs every day at 23:55 (11:55 PM)
const startCronJobs = () => {
  cron.schedule('55 23 * * *', async () => {
    console.log('🕒 Running auto-absent job...');
    try {
      const today = new Date();
      // Only process for Mon-Fri if weekends are off, or you can skip this if you work every day
      if (today.getDay() === 0 || today.getDay() === 6) {
        console.log('Skipping auto-absent check for weekend.');
        return;
      }

      const todayStr = today.toISOString().split('T')[0];
      const startOfDay = new Date(todayStr);
      const endOfDay = new Date(todayStr);
      endOfDay.setDate(endOfDay.getDate() + 1);

      // Get all active employees
      const employees = await Employee.find({ status: 'Active' });

      let absentCount = 0;
      for (const emp of employees) {
        // Skip if joining date is in the future
        if (emp.joiningDate && emp.joiningDate > today) continue;

        // Check if attendance exists for today
        const existing = await Attendance.findOne({
          employeeId: emp.id,
          date: { $gte: startOfDay, $lt: endOfDay }
        });

        if (!existing) {
          // Create Absent record
          await Attendance.create({
            id: uuidv4(),
            employeeId: emp.id,
            employeeName: emp.name || `${emp.firstName} ${emp.lastName}`,
            date: startOfDay,
            checkIn: '',
            checkOut: '',
            status: 'Absent',
            lateByMinutes: 0
          });
          absentCount++;
        }
      }

      console.log(`✅ Auto-absent job completed. Marked ${absentCount} employees as Absent.`);
    } catch (error) {
      console.error('❌ Error in auto-absent job:', error);
    }
  });
};

export default startCronJobs;
