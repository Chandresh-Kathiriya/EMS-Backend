const Holiday = require('../models/Holiday');
const WeekOff = require('../models/WeekOff');
const { Op } = require('sequelize');
const UserSalary = require('../models/UserSalary');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

const toISO = date => new Date(date).toISOString().split('T')[0];

const eachDayOfInterval = ({ start, end }) => {
  const dates = [];
  let current = new Date(start);
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const calculateLogHours = (times = []) => {
  if (!Array.isArray(times) || times.length === 0) return 0;

  // Normalize and sort timestamps
  const sorted = [...times]
    .map(t => {
      // If t is not a string, check if it's a Date object
      if (typeof t === 'string') {
        // If it's a string, replace the space with 'T' to make it ISO-compliant
        return new Date(t.replace(' ', 'T'));
      }
      // If it's already a Date object, just use it directly
      return t instanceof Date ? t : new Date(t);
    })
    .sort((a, b) => a - b); // Sort timestamps in ascending order

  let totalMinutes = 0;

  for (let i = 0; i < sorted.length; i += 2) {
    const inTime = sorted[i];
    let outTime = sorted[i + 1];

    if (!outTime) {
      const sevenPM = new Date(inTime);
      sevenPM.setHours(19, 0, 0, 0); // Set to 7:00 PM
      if (inTime < sevenPM) {
        outTime = sevenPM; // Set outTime to 7 PM if no pair is available
      } else {
        continue; // Skip unmatched punches after 7 PM
      }
    }

    if (inTime < outTime) {
      totalMinutes += (outTime - inTime) / 60000; // Calculate the difference in minutes
    }
  }

  return totalMinutes;
};

const monthDiff = (start, end) => {
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return yearDiff * 12 + monthDiff;
};

exports.calculatePayRoll = async (req, res) => {
  try {
    const { userId, month } = req.body;  // Extract userId and month (in YYYY-MM-01 format)

    // Parse the month (YYYY-MM-01)
    const [year, monthNumber] = month.split('-'); // year: YYYY, monthNumber: MM

    const today = new Date();

    // Ensure the month and year are valid
    if (parseInt(monthNumber) < 1 || parseInt(monthNumber) > 12) {
      return res.status(400).json({ success: false, message: 'Invalid month selected.' });
    }

    // Set the start and end date for the selected month
    let startDate = new Date(year, monthNumber - 1, 1);  // Month is 0-indexed
    let endDate = new Date(year, monthNumber, 0);  // Last day of the month

    // Ensure the payroll is generated for a single month
    if (monthDiff(startDate, endDate) !== 0) {
      return res.status(400).json({ success: false, message: 'Please select a single month for payroll.' });
    }

    // Prevent selecting future months or the current month
    if (startDate > today || endDate > today) {
      return res.status(400).json({ success: false, message: 'Future dates not allowed.' });
    }

    if (startDate.getMonth() === today.getMonth() && startDate.getFullYear() === today.getFullYear()) {
      return res.status(400).json({ success: false, message: 'Cannot fetch current month payroll.' });
    }

    // Set the start and end hours to ensure correct date boundaries
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Fetch data from the database
    const [users, attendances, salaries, leaves, holidays] = await Promise.all([
      User.findAll({ where: { is_deleted: 0, ...(userId ? { id: userId } : {}) }, attributes: ['id', 'dateOfJoining', 'weekOffId'] }),
      Attendance.findAll({ where: { isDeleted: 0, date: { [Op.between]: [startDate, endDate] } }, attributes: ['userId', 'date', 'time'] }),
      UserSalary.findAll({ where: { isActive: 1, isDeleted: 0, ...(userId ? { userId } : {}) }, attributes: ['userId', 'amount'] }),
      Leave.findAll({
        where: {
          status: 'Approved',
          isDeleted: 0,
          [Op.or]: [
            { startDate: { [Op.lte]: endDate } },
            { endDate: { [Op.gte]: startDate } }
          ]
        },
        attributes: ['userId', 'startDate', 'endDate', 'startDay', 'endDay']
      }),
      Holiday.findAll({
        where: {
          isDeleted: 0,
          [Op.and]: [
            { startDate: { [Op.lte]: endDate } },
            { endDate: { [Op.gte]: startDate } }
          ]
        },
        attributes: ['startDate', 'endDate']
      })
    ]);

    const weekOffs = await Promise.all(users.map(async (user) => {
      const weekOff = await WeekOff.findOne({
        where: {
          id: user.weekOffId,  // Use the specific weekOffId for each user
          isDeleted: 0
        },
        attributes: ['id', 'effectiveDate', 'days']
      });
      return weekOff;
    }));


    // Prepare Maps for further use
    const salaryMap = Object.fromEntries(salaries.map(s => [s.userId, s.amount]));
    const weekOffMap = {};
    weekOffs.forEach((weekOff) => {
      if (weekOff) {
        weekOffMap[weekOff.id] = weekOff;
      }
    });

    const holidaySet = new Set();
    holidays.forEach(h => {
      eachDayOfInterval({ start: new Date(h.startDate), end: new Date(h.endDate) })
        .forEach(date => holidaySet.add(toISO(date)));
    });

    const leaveMap = {};
    const leaveCountMap = {};

    // Process leaves and leave counts
    leaves.forEach(leave => {
      const uid = leave.userId;
      if (!leaveMap[uid]) leaveMap[uid] = new Set();
      if (!leaveCountMap[uid]) leaveCountMap[uid] = 0;

      const dates = eachDayOfInterval({ start: new Date(leave.startDate), end: new Date(leave.endDate) });
      const leaveDatesInPeriod = dates.filter(date => date >= startDate && date <= endDate);

      leaveDatesInPeriod.forEach((date, i) => {
        const iso = toISO(date);
        leaveMap[uid].add(iso);

        if (leaveDatesInPeriod.length === 1) {
          leaveCountMap[uid] += (leave.startDay === 'Full Day') ? 1 : 0.5;
        } else {
          if (i === 0) leaveCountMap[uid] += (leave.startDay === 'Full Day' ? 1 : 0.5);
          else if (i === leaveDatesInPeriod.length - 1) leaveCountMap[uid] += (leave.endDay === 'Full Day' ? 1 : 0.5);
          else leaveCountMap[uid] += 1;
        }
      });
    });

    const attendanceMap = {};
    attendances.forEach(({ userId, date, time }) => {
      const iso = toISO(date);
      attendanceMap[userId] = attendanceMap[userId] || {};
      attendanceMap[userId][iso] = attendanceMap[userId][iso] || [];
      attendanceMap[userId][iso].push(time);
    });

    const result = users.map(user => {
      const doj = new Date(user.dateOfJoining);
      const effectiveStart = doj > startDate ? doj : new Date(startDate);
      const effectiveEnd = new Date(endDate);

      if (effectiveStart > effectiveEnd) {
        return {
          userId: user.id,
          salary: '0.00',
          officialWorkingDays: 0,
          actualWorkingDays: 0,
          deduction: '0.00',
          payable: '0.00',
          message: 'Joined after payroll period',
          doj: user.dateOfJoining,
          leaveCount: 0
        };
      }

      const salary = salaryMap[user.id] || 0;

      const weekOffSet = new Set();
      const weekOff = weekOffMap[user.weekOffId];

      // For each week-off entry
      if (weekOff) {
        // Parse days configuration (ensure it's an object, not an array)
        const days = typeof weekOff.days === 'string' ? JSON.parse(weekOff.days) : weekOff.days;
        
        // Debug: Log the ENTIRE days object (not days[0])
        console.log("Days Configuration:", days);
      
        const effectiveDate = new Date(weekOff.effectiveDate);
        effectiveDate.setHours(0, 0, 0, 0); // Local time
      
        // if (effectiveDate <= effectiveEnd) {
          const woStart = effectiveStart;
      
          eachDayOfInterval({ start: woStart, end: effectiveEnd }).forEach(date => {
            const iso = toISO(date);
            
            // Use LOCAL day names (not UTC)
            const localDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = localDayNames[date.getDay()]; // getDay() returns local day (0-6)
            const config = days[dayName]; // Now uses local day name
      
            console.log(`Checking ${iso} (${dayName}):`, config);
      
            if (!config || config.length === 0) return;
      
            const type = config[0];
            if (type === 'FullDay' || type === 'HalfDay') return;
      
            if (type === 'WeekOff') {
              const qualifiers = config.slice(1);
              if (qualifiers.length > 0) {
                // Use LOCAL date for week calculation
                const localDate = date.getDate(); // Local date of the month (1-31)
                const weekNumber = Math.ceil(localDate / 7);
                const weekLabel = ['First', 'Second', 'Third', 'Fourth'][weekNumber - 1];
      
                if (qualifiers.includes(weekLabel)) {
                  weekOffSet.add(iso);
                }
              } else {
                weekOffSet.add(iso);
              }
            }
          });
        // }
      }

      console.log("Final Week-Off Set:", weekOffSet);


      let officialDays = 0, actualDays = 0;
      eachDayOfInterval({ start: effectiveStart, end: effectiveEnd }).forEach(date => {
        const iso = toISO(date);
        const attendedMins = calculateLogHours(attendanceMap[user.id]?.[iso]);

        if (!holidaySet.has(iso) && !weekOffSet.has(iso)) {
          officialDays++;
        }

        if (attendedMins >= 360) {
          actualDays += 1;
        } else if (attendedMins >= 240) {
          actualDays += 0.5;
        }
      });

      const perDay = officialDays ? salary / officialDays : 0;
      const deduction = Math.max(0, (officialDays - actualDays) * perDay);
      const payable = Math.min(salary, salary - deduction);

      return {
        userId: user.id,
        doj: user.dateOfJoining,
        month: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
        baseSalary: salaryMap[user.id] || 0,
        salary: salary.toFixed(2),
        officialWorkingDays: officialDays,
        actualWorkingDays: actualDays,
        deduction: deduction.toFixed(2),
        payable: payable.toFixed(2),
        leave: leaveCountMap[user.id] || 0
      };
    });

    return res.status(200).json({ success: true, message: "Payroll data fetched", data: result });

  } catch (error) {
    console.error("Payroll Error:", error);
    return res.status(500).json({ success: false, message: "Error while calculating payroll" });
  }
};