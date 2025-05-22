const cron = require('node-cron');
const { calculatePayRoll } = require('./cronController');
const Payroll = require('../models/PayRoll');
const PayRollErrorLog = require('../models/PayRollErrorLog');
const User = require('../models/User');

// ✅ Helper function: Convert date to YYYY-MM-01
function formatToMonthStart(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-01`;
}

// ✅ Helper: Generate month list between two dates
function getMonthRange(start, end) {
  const result = [];
  const current = new Date(start);
  current.setDate(1);

  const endDate = new Date(end);
  endDate.setDate(1);

  while (current <= endDate) {
    result.push(formatToMonthStart(current));
    current.setMonth(current.getMonth() + 1);
  }

  return result;
}

async function logFailure(userId, targetMonth, errorMessage) {
  try {
    await PayRollErrorLog.create({
      userId,
      targetMonth,
      errorMessage,
    });
    console.log(`Logged failure for user ${userId} for month ${targetMonth}.`);
  } catch (err) {
    console.error('Error logging failure:', err);
  }
}

// Updated cron logic with join date check
async function runCronWithRetry(retryCount = 0) {
  try {
    let successCount = 0;
    let failCount = 0;
    const failedUsers = [];

    const users = await User.findAll({
      where: { is_deleted: 0 },
      attributes: ['id', 'dateOfJoining'],
    });

    const now = new Date();
    now.setDate(1);             // Go to 1st of current month
    now.setMonth(now.getMonth() - 1); // Current month start

    for (const user of users) {
      const userId = user.id;
      const joiningDate = new Date(user.dateOfJoining);

      const months = getMonthRange(joiningDate, now);

      for (const targetMonth of months) {
        const exists = await Payroll.findOne({
          where: {
            userId: userId,
            month: targetMonth,
          },
        });

        if (!exists) {
          console.log(`Generating payroll for user ${userId} for month ${targetMonth}`);

          const req = { body: { userId, month: targetMonth } };
          const res = {
            status: () => ({
              json: async (data) => {
                if (data.success) {
                  for (const payroll of data.data) {

                    await Payroll.create({
                      userId: payroll.userId,
                      baseSalary: payroll.baseSalary,
                      officialWorkingDays: payroll.officialWorkingDays,
                      actualWorkingDays: payroll.actualWorkingDays,
                      deduction: payroll.deduction,
                      payable: payroll.payable,
                      leave: payroll.leave,
                      month: targetMonth,
                    });
                    successCount++;
                  }
                } else {
                  console.error(`Payroll generation failed for user ${userId}, month ${targetMonth}:`, data.message);
                  await logFailure(userId, targetMonth, data.message)
                }
              },
            }),
            json: console.error,
          };

          await calculatePayRoll(req, res);
        } else {
          console.log(`✔ Payroll already exists for user ${userId} for ${targetMonth}. Skipping.`);
        }
      }
    }
    console.log(`Payroll generation complete. Success: ${successCount}, Failed: ${failCount}`);
    if (failedUsers.length) {
      console.log('🔁 Failed entries:', JSON.stringify(failedUsers, null, 2));
    }
    return {
      success: true,
      message: `Payroll generation complete. Success: ${successCount}, Failed: ${failCount}`
    };
  } catch (error) {
    console.error('Error in cron job:', error);
    if (retryCount < 3) {
      console.log(`Retrying cron job, attempt ${retryCount + 1}...`);
      await runCronWithRetry(retryCount + 1);
    } else {
      console.log('Max retries reached. Cron job failed.');
    }
  }
}

// Schedule on 1st of every month at 00:00
cron.schedule('0 0 1 * *', async () => {
  console.log('Running scheduled monthly payroll cron...');
  await runCronWithRetry(0);
});

module.exports = {
  runCronWithRetry,
};