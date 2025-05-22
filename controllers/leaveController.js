// controllers/leaveController.js
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// import require core module and models
const Leave = require('../models/Leave');
const LeaveType = require('../models/LeaveType');
const User = require('../models/User');
const SMTPSetting = require('../models/SMTPSetting');
const { Op } = require('sequelize');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes
const IV_LENGTH = 16;

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedText = Buffer.from(textParts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function getSmtpDataFromDB() {
  const data = await SMTPSetting.findOne();
  if (data) {
    const decryptedPass = decrypt(data?.password)
    return {
      host: data.host,
      port: data.port,
      userEmail: data.userEmail,
      password: decryptedPass,
      fromName: data.fromName,
      emailFrom: data.emailFrom,
      bbcEmail: data.bbcEmail
    };
  }
  throw new Error('SMTP configuration not found');
}

// Get leave data of all user
exports.getLeaveData = async (req, res) => {
  try {
    let { page = 1, per_page = 10, dateFrom, dateTo, status, month, year, user, leaveType } = req.body;

    const userId = req.userId

    const isMonthlyFilter = month && year;

    // If month/year provided, build startDate range only
    if (isMonthlyFilter) {
      const start = new Date(year, month - 1, 1); // e.g. April = 3 (0-indexed)
      const end = new Date(year, month, 0); // Last day of the month
      dateFrom = start.toISOString().split('T')[0];
      dateTo = end.toISOString().split('T')[0];
    }

    let query = {
      include: [
        {
          model: User,
          attributes: ['full_name'],
          required: true,
        },
        {
          model: LeaveType,
          attributes: ['name'],
          required: true
        }
      ],
      where: {
        isDeleted: 0
      },
      order: [['createdAt', 'DESC']]
    };

    if (userId && userId !== 1) {
      query.where.userId = userId
    }

    // Apply pagination only when not monthly filter
    if (!isMonthlyFilter) {
      query.limit = parseInt(per_page);
      query.offset = (page - 1) * per_page;
    }

    // Only filter on startDate if using month/year
    if (isMonthlyFilter) {
      query.where.startDate = {
        [Op.gte]: dateFrom,
        [Op.lte]: dateTo
      };
    } else {
      // If dateFrom and dateTo manually provided
      if (dateFrom && dateTo) {
        query.where.startDate = { [Op.gte]: dateFrom };
        query.where.endDate = { [Op.lte]: dateTo };
      } else if (dateFrom) {
        query.where.startDate = { [Op.gte]: dateFrom };
      } else if (dateTo) {
        query.where.endDate = { [Op.lte]: dateTo };
      }
    }

    // Filter by leave status
    if (status) {
      query.where.status = status;
    }

    if (dateFrom || dateTo) {
      // Initialize startDate/endDate conditionally
      if (dateFrom) {
        query.where.startDate = query.where.startDate || {};
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        query.where.startDate[Op.gte] = fromDate;
      }

      if (dateTo) {
        query.where.endDate = query.where.endDate || {};
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.where.endDate[Op.lte] = toDate;
      }
    }

    if (user) {
      query.where.empCode = user
    }

    if (leaveType) {
      query.where.leaveType = leaveType
    }

    const { count, rows } = await Leave.findAndCountAll(query);

    const processedData = rows.map(leave => {
      const fullName = leave.User.full_name;
      const leaveName = leave.LeaveType.name;

      const calculateLeaveDays = (startDate, endDate, startDayType, endDayType) => {
        if (startDate && !endDate) {
          endDate = startDate; // If endDate is not provided, assume it’s the same as startDate
        }
        if (!startDate) return 0; // If no start date, return 0 leave days

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get the difference in time (in milliseconds)
        const diffTime = Math.abs(end - start);
        let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Total days between start and end date

        // Adjust for start and end day types (half-day or full-day)
        if (startDayType === 'First Half' || startDayType === 'Second Half') {
          totalDays -= 0.5; // Subtract 0.5 for a half-day leave at the start
        }
        if (endDayType === 'First Half') {
          totalDays -= 0.5; // Subtract 0.5 for a half-day leave at the end
        }

        return totalDays > 0 ? totalDays : 0; // Ensure leave days is non-negative
      };

      // Assuming leave.startDayType and leave.endDayType are available and contain 'full' or 'half'
      const leaveDays = calculateLeaveDays(leave.startDate, leave.endDate, leave.startDay, leave.endDay);

      return {
        ...leave.get({ plain: true }),
        full_name: fullName,
        leaveName,
        leaveDays,
      };
    });

    const response = {
      data: processedData
    };

    // Add pagination only if paginated
    if (!isMonthlyFilter) {
      response.pagination = {
        total: count,
        page: parseInt(page),
        per_page: parseInt(per_page),
        total_pages: Math.ceil(count / per_page)
      };
    }
    res.json(response);

  } catch (error) {
    console.error('Error fetching leave data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching leave data',
      error: error.message
    });
  }
};

// delete leave 
exports.deleteLeave = async (req, res) => {
  const { leaveId } = req.body

  try {
    const leave = await Leave.findOne({
      where: {
        id: leaveId
      }
    })
    if (leave) {
      leave.isDeleted = 1
    }

    await leave.save()

    res.json({
      success: true,
      message: 'Leave Deleted Successfully.'
    })
  } catch (error) {

  }
}

// Get leave Type data
exports.getLeaveTypeData = async (req, res) => {
  try {
    let { page, per_page } = req.body;

    // Build base query
    let query = {
      where: { isDeleted: 0 },
      order: [['createdAt', 'DESC']],
    };

    // Apply pagination only if page and per_page are provided
    if (page && per_page) {
      page = parseInt(page);
      per_page = parseInt(per_page);
      const offset = (page - 1) * per_page;
      query.limit = per_page;
      query.offset = offset;
    }

    // Fetch data
    const { count, rows } = await LeaveType.findAndCountAll(query);

    const processedData = rows.map(leaveType => ({
      ...leaveType.get({ plain: true }),
      leaveCode: leaveType.code
    }));

    res.json({
      data: processedData,
      pagination: page && per_page ? {
        total: count,
        page: page,
        per_page: per_page,
        total_pages: Math.ceil(count / per_page)
      } : null
    });

  } catch (error) {
    console.error('Error fetching leave type data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching leave type data',
      error: error.message
    });
  }
};

// Update LeaveType
exports.createLeaveType = async (req, res) => {
  const { name, code } = req.body
  try {
    const leaveType = await LeaveType.create({ name, code })
    return res.status(200).json({ message: 'Leave Type created successfully.' })
  } catch (error) {
    console.log('error is: ', + error)
    return res.status(500).json({
      message: 'An error occurred while updating the data.'
    })
  }
}

// Update LeaveType
exports.updateLeaveType = async (req, res) => {
  const { id, name, code } = req.body
  try {
    const leaveType = await LeaveType.update({ name, code }, {
      where: {
        id: id
      }
    })
    return res.status(200).json({ message: 'Leave Type updated successfully.' })
  } catch (error) {
    return res.status(500).json({
      message: 'An error occurred while updating the data.'
    })
  }
}

// Delete LeaveType by id
exports.deleteLeaveType = async (req, res) => {
  const { id } = req.body
  try {
    const leaveType = await LeaveType.update({ isDeleted: 1 }, { where: { id: id } })
    return res.status(200).json({ message: 'Leave Type deleted successfully.' })
  } catch (error) {
    console.log('error is : ' + error)
    return res.status(500).json({
      message: 'An error occurred while deleting the data.',
    })
  }
}

// Approve Pending leave by id
exports.approvePendingLeave = async (req, res) => {
  const { id, user } = req.body
  try {
    const leave = await Leave.update({ status: 'Approved', updatedBy: user }, { where: { id: id } })
    return res.status(200).json({ message: 'Leave Type deleted successfully.' })
  } catch (error) {
    console.log('error is : ' + error)
    return res.status(500).json({
      message: 'An error occurred while deleting the data.',
    })
  }
}

// Reject Pending leave by id
exports.rejectPendingLeave = async (req, res) => {
  const { id, user } = req.body
  try {
    const leave = await Leave.update({ status: 'Rejected', updatedBy: user }, { where: { id: id } })
    return res.status(200).json({ message: 'Leave Type deleted successfully.' })
  } catch (error) {
    console.log('error is : ' + error)
    return res.status(500).json({
      message: 'An error occurred while deleting the data.',
    })
  }
}

// Function to send email
const sendMail = (transporter, mailOptions) => {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return reject(error);
      }
      resolve(info);
    });
  });
};

function formatDate(isoString) {
  const date = new Date(isoString);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

// Add new leave
exports.newLeave = async (req, res) => {
  const { userId, empCode, endDate, leaveEndDay, leaveReason, leaveStartDay, leaveType, startDate } = req.body

  try {
    const newLeave = await Leave.create({ empCode, userId, endDate, leaveReason, leaveType, startDate, startDay: leaveStartDay, endDay: leaveEndDay ? leaveEndDay : null })

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email user or password is not set in .env file');
      process.exit(1);
    }

    const userData = await User.findOne({
      attributes: ['id', 'full_name', 'parent_id'],
      where: {
        id: userId
      },
      include: [
        {
          model: User,
          as: 'reportingManager',
          attributes: ['email'],
          required: false,
        }
      ]
    });

    const leaveDetails = await LeaveType.findOne({
      attributes: ['id', 'name'],
      where: {
        id: leaveType
      }
    })

    const startDateFormat = formatDate(startDate);
    const endDateFormat = formatDate(endDate);

    const dateRangeText = endDate
      ? `from <strong>${startDateFormat} (${leaveStartDay}) to ${endDateFormat} (${leaveEndDay})</strong>`
      : `on <strong>${startDateFormat} (${leaveStartDay})</strong>`;

    // Get SMTP config from DB
    const smtpData = await getSmtpDataFromDB();

    // Create a new transporter using DB credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpData.userEmail,
        pass: smtpData.password,
      },
    });

    const mailOptions = {
      from: `${smtpData.emailFrom}`,
      to: [userData.reportingManager.email, 'kathiriyachandresh2@gmail.com'],
      subject: 'Leave Application',
      html: `Respected Sir/Ma'am,<br><br>

      I hope you are doing well. I am writing to request a <strong>${leaveDetails.name} Leave </strong> ${dateRangeText}.</strong> The reason for my leave is: <strong>'${leaveReason}'</strong>.<br><br>

      I will ensure that all my responsibilities are managed and handed over properly to avoid any disruption in work. Please let me know if you need any further information or clarification regarding my leave request.<br><br>

      Thank you for considering my request. I look forward to your approval.<br><br>

      <strong>Best regards,</strong><br>
      <strong>${userData.full_name}</strong>`,
    };

    await sendMail(transporter, mailOptions);

    return res.status(200).json({ message: 'Leave Created successfully.' })
  } catch (error) {
    console.log('error is : ' + error)
    return res.status(500).json({
      message: 'An error occurred while deleting the data.',
    })
  }
}

// update leave by id
exports.updateLeaveBy = async (req, res) => {
  const leaveID = req.query.id

  const {
    empCode,
    endDate,
    leaveEndDay,
    leaveReason,
    leaveStartDay,
    leaveType,
    startDate
  } = req.body;

  try {
    // Dynamically build the update object
    const updateData = {};

    // if (empCode !== undefined) updateData.empCode = empCode;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (leaveEndDay !== undefined) updateData.endDay = leaveEndDay;
    if (leaveReason !== undefined) updateData.leaveReason = leaveReason;
    if (leaveStartDay !== undefined) updateData.startDay = leaveStartDay;
    if (leaveType !== undefined) updateData.leaveType = leaveType;
    if (startDate !== undefined) updateData.startDate = startDate;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    // Proceed to update
    const updatedRows = await Leave.update(updateData, {
      where: { id: leaveID }
    });

    if (updatedRows[0] === 0) {
      return res.status(404).json({
        message: 'Leave record not found with the provided ID.',
      });
    }

    return res.status(200).json({
      message: 'Leave record updated successfully.',
    });

  } catch (error) {
    console.error('Error updating leave record:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}