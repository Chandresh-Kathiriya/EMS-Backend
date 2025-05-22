// controllers/attendanceController.js

// import require core module and models
const sequelize = require('../config/dbConnection')
const User = require('../models/User');
const Regularization = require('../models/Regularization');
const Attendance = require('../models/Attendance');
const { Op, fn, col, literal } = require('sequelize');

async function getLatestGroupedAttendance(userId = null, limit = 10, page = 1, month = null, year = null, fromDate = null, toDate = null) {
  try {
    const offset = (page - 1) * limit;

    // Construct dynamic where conditions
    let whereConditions = {
      isDeleted: 0
    };

    if (userId) {
      whereConditions.userId = userId;
    }

    // Add month & year filters using Sequelize.fn
    if (month && year) {
      whereConditions[Op.and] = [
        sequelize.where(sequelize.fn('MONTH', sequelize.col('date')), month),
        sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), year)
      ];
    }

    if (fromDate && toDate) {
      whereConditions.date = {
        [Op.between]: [fromDate, toDate]
      };
    } else if (fromDate) {
      whereConditions.date = {
        [Op.gte]: fromDate
      };
    } else if (toDate) {
      whereConditions.date = {
        [Op.lte]: toDate
      };
    }

    // Step 1: Use Sequelize to count total groups (userId + date)
    const countResult = await Attendance.findAll({
      attributes: [
        [sequelize.col('userId'), 'userId'],
        [sequelize.fn('DATE', sequelize.col('date')), 'date']
      ],
      where: whereConditions,
      group: ['userId', sequelize.fn('DATE', sequelize.col('date'))],
      raw: true
    });

    const totalGroups = countResult.length;
    const totalPages = Math.ceil(totalGroups / limit);

    // Step 2: Fetch userId + date combinations (grouped for pagination)
    const attendanceGroups = await Attendance.findAll({
      attributes: [
        'userId',
        [sequelize.fn('DATE', sequelize.col('date')), 'date'],
        [sequelize.fn('MAX', sequelize.col('id')), 'id']
      ],
      where: whereConditions,
      group: ['userId', sequelize.fn('DATE', sequelize.col('date'))],
      order: [[sequelize.fn('DATE', sequelize.col('date')), 'DESC']],
      limit: limit > 0 ? limit : undefined,
      offset: limit > 0 ? offset : undefined,
      raw: true
    });

    const conditions = attendanceGroups.map(group => ({
      userId: group.userId,
      date: group.date,
      isDeleted: 0
    }));

    if (conditions.length === 0) return [];

    // Step 3: Fetch matching attendance records
    let attendanceRecords;

    if (month && year) {
      // When filtering by month & year: minimal fields
      attendanceRecords = await Attendance.findAll({
        where: { [Op.or]: conditions },
        attributes: ['id', 'userId', 'date', 'time'],
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Full fetch with user info
      attendanceRecords = await Attendance.findAll({
        where: { [Op.or]: conditions },  // You can keep your original conditions here
        include: [
          {
            model: User,
            attributes: ['full_name'],
            required: true
          },
          {
            model: Regularization,
            where: {
              userId: sequelize.col('Attendance.userId'),
              [Op.and]: [
                sequelize.where(sequelize.fn('DATE', sequelize.col('Attendance.date')), sequelize.fn('DATE', sequelize.col('Regularization.date')))
              ]
            },
            required: false,  // This ensures we get all the matching regularizations
            attributes: ['id', 'userId', 'date', 'punchTime', 'status', 'reason', 'remarks']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    }

    // Step 4: Group attendance records by userId + date
    const groupedMap = attendanceRecords.reduce((acc, item) => {
      const key = `${item.userId}_${item.date}`;

      if (!acc[key]) {
        acc[key] = {
          userId: item.userId,
          date: item.date,
          records: [],
          regularization: []
          // regularization: item.Regularization || null // Attach regularization data
        };
      }

      // Ensure uniqueness based on item.id (assuming the id is unique to each attendance record)
      const existingRecord = acc[key].records.find(record => record.dataValues.id === item.dataValues.id);

      if (!existingRecord) {
        acc[key].records.push(item);
      }

      if (item.Regularization) {
        const existingRegularization = acc[key].regularization.find(reg => reg.id === item.Regularization.id);
        if (!existingRegularization) {
          acc[key].regularization.push(item.Regularization);
        }
      }

      return acc;
    }, {});

    // Step 5: Sort the grouped data
    const sortedGroupedArray = Object.values(groupedMap).sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    return {
      data: sortedGroupedArray,
      pagination: month && year ? null : {
        count: totalGroups,
        page: page,
        per_page: limit,
        total_pages: totalPages
      }
    };

  } catch (error) {
    console.log(error);
    throw new Error('Error fetching attendance data');
  }
}

async function getMissAttendance(userId = null, limit = 10, page = 1, fromDate = null, toDate = null) {
  try {
     let whereConditions = {};
    const offset = (page - 1) * limit;

    // Step 1: Determine user filter
    let userFilter = {};
    if (userId) {
      userFilter = { id: userId };
    }

    const userList = await User.findAll({
      where: userFilter,
      attributes: ['id'],
      raw: true
    });

    const userIds = userList.map(u => u.id);
    if (userIds.length === 0) return [];

    if (fromDate && toDate) {
      whereConditions.date = {
        [Op.between]: [fromDate, toDate]
      };
    } else if (fromDate) {
      whereConditions.date = {
        [Op.gte]: fromDate
      };
    } else if (toDate) {
      whereConditions.date = {
        [Op.lte]: toDate
      };
    }

    // Step 2: Find grouped attendance (odd count only)
    const grouped = await Attendance.findAll({
      attributes: [
        'userId',
        [fn('DATE', col('date')), 'date'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        ...whereConditions,
        userId: { [Op.in]: userIds },
        isDeleted: 0,
      },
      group: ['userId', fn('DATE', col('date'))],
      having: literal('COUNT(id) % 2 = 1'),
      order: [[fn('DATE', col('date')), 'DESC']],
      limit,
      offset,
      raw: true
    });

    // Step 3: Calculate total groups (distinct combinations of userId and date)
    const totalGroupsResult = await Attendance.findAll({
      attributes: [
        'userId',
        [fn('DATE', col('date')), 'date']
      ],
      where: {
        ...whereConditions,
        userId: { [Op.in]: userIds },
        isDeleted: 0,
      },      
      group: ['userId', fn('DATE', col('date'))],
      having: literal('COUNT(id) % 2 = 1'),
      raw: true
    });

    // Total number of distinct groups (userId + date combinations)
    const totalGroups = totalGroupsResult.length;

    // Calculate total pages based on total groups
    const totalPages = Math.ceil(totalGroups / limit);

    const conditions = grouped.map(g => ({
      userId: g.userId,
      date: g.date,
      // isDeleted: 0
    }));

    if (conditions.length === 0) return [];

    // Step 4: Fetch detailed attendance records
    const records = await Attendance.findAll({
      where: { [Op.or]: conditions },
      include: [
        {
          model: User,
          attributes: ['full_name'],
          required: true
        },
        {
          model: Regularization,
          where: {
            ...whereConditions,
            [Op.and]: [
              { [Op.or]: conditions }
            ]
          },
          required: false,
          attributes: ['id', 'userId', 'date', 'punchTime', 'status', 'reason', 'remarks']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Step 5: Group results
    const groupedMap = records.reduce((acc, item) => {
      const key = `${item.userId}_${item.date}`;
      if (!acc[key]) {
        acc[key] = {
          userId: item.userId,
          date: item.date,
          records: [],
          regularization: []
        };
      }

      // Make sure the attendance record is not duplicated
      const alreadyExists = acc[key].records.some(r => r.id === item.id);
      if (!alreadyExists) {
        acc[key].records.push(item);
      }

      // Same for regularizations
      if (item.Regularization) {
        const regExists = acc[key].regularization.some(r => r.id === item.Regularization.id);
        if (!regExists) {
          acc[key].regularization.push(item.Regularization);
        }
      }

      return acc;
    }, {});

    // Sort the grouped data by date
    const finalData = Object.values(groupedMap).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Return the results with pagination
    return {
      data: finalData,
      pagination: {
        count: totalGroups, // Total number of groups (userId + date combinations)
        page,
        per_page: limit,
        total_pages: totalPages // Total number of pages based on the number of groups
      }
    };

  } catch (err) {
    console.error(err);
    throw new Error('Error fetching odd attendance records');
  }
}

// Get Attendance data of all User
exports.getAttendanceData = async (req, res) => {
  try {
    const page = parseInt(req.body.page) || 1;
    const per_page = parseInt(req.body.per_page);
    const userId = parseInt(req.body.userId) || parseInt(req.body.filterUser) || null;
    const fromDate = req.body.fromDate || null;
    const toDate = req.body.toDate || null

    const groupedAttendance = await getLatestGroupedAttendance(userId, per_page, page, null, null, fromDate, toDate);

    res.json({
      success: true,
      data: groupedAttendance.data,
      pagination: groupedAttendance.pagination
    });

  } catch (error) {
    console.log(error, "ERROR IS HERE")
    console.error('Error fetching attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching attendance data',
      error: error.message
    });
  }
};

exports.getMissAttendanceData = async (req, res) => {
  try {
    const page = parseInt(req.body.page);
    const per_page = parseInt(req.body.per_page);
    const userId = parseInt(req.body.userId) || parseInt(req.body.filterUser) || null;
    const fromDate = req.body.fromDate || null;
    const toDate = req.body.toDate || null

    const groupedAttendance = await getMissAttendance(userId, per_page, page, fromDate, toDate);

    res.json({
      success: true,
      data: groupedAttendance.data,
      pagination: groupedAttendance.pagination
    });

  } catch (error) {
    console.log(error, "ERROR IS HERE")
    console.error('Error fetching attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching attendance data',
      error: error.message
    });
  }
};

exports.getMonthAttendanceData = async (req, res) => {
  try {
    const month = parseInt(req.body.month);
    const year = parseInt(req.body.year);

    const groupedAttendance = await getLatestGroupedAttendance(null, 0, 1, month, year);

    res.json({
      success: true,
      data: groupedAttendance.data,
      pagination: groupedAttendance.pagination

    });

  } catch (error) {
    console.log(error, "ERROR IS HERE")
    console.error('Error fetching attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching attendance data',
      error: error.message
    });
  }
};

exports.getTodayAllAttendanceData = async (req, res) => {
  try {
    const date = new Date();
    const formattedDate = date.toISOString().split('T')[0];
    const { userId } = req.body;

    const whereClause = {
      date: formattedDate,
      isDeleted: 0,
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const attendanceRecords = await Attendance.findAll({
      attributes: ['id', 'userId', 'time'],
      include: {
        model: User,
        attributes: [['full_name', 'name']],
        required: true,
      },
      where: whereClause,
      order: [['createdAt', 'ASC']],
      raw: true,
    });

    const normalizedRecords = attendanceRecords.map((record) => {
      const { 'User.name': name, ...rest } = record;
      return { ...rest, name };
    });

    if (userId) {
      res.json({
        success: true,
        data: normalizedRecords,
      });
    } else {
      // Group by userId
      const groupedByUser = normalizedRecords.reduce((acc, record) => {
        const uid = record.userId;
        if (!acc[uid]) {
          acc[uid] = [];
        }
        acc[uid].push(record);
        return acc;
      }, {});

      const result = Object.entries(groupedByUser).map(([uid, records]) => ({
        userId: parseInt(uid),
        records,
      }));

      res.json({
        success: true,
        data: result,
      });
    }
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

exports.getExportAttendanceData = async (req, res) => {
  try {
    let { userId, filterUser, fromDate, toDate } = req.body;

    // Build base query
    let query = {
      where: { isDeleted: 0 },
      order: [['createdAt', 'DESC']],
    };

    if (fromDate && toDate) {
      query.where.date = { [Op.gte]: fromDate };
    } else if (fromDate) {
      query.where.date = { [Op.gte]: fromDate };
    } else if (toDate) {
      query.where.date = { [Op.lte]: toDate };
    }

    if (userId) {
      query.where.userId = userId
    }

    if (filterUser) {
      query.where.userId = userId
    }

    // Fetch data
    const rows  = await Attendance.findAll(query);

    res.json({
      data: rows,
      message: 'data fetch successfully'
    });
  } catch (error) {
    
  }
}

// Get Regularization data of all User
exports.getRegularizationData = async (req, res) => {
  try {
    const { page = 1, per_page = 10, user, status, fromDate, toDate } = req.body;
    const offset = (page - 1) * per_page;

    // Build the base query
    let query = {
      include: [
        {
          model: User,
          attributes: ['full_name'],
          required: true,
        }
      ],
      limit: parseInt(per_page),
      offset: offset,
      where: {},
      order: [
        ['date', 'DESC'],
      ]
    };

    // Status filter
    if (status) {
      query.where.status = status;
    } else {
      query.where.status = 'Pending';
    }

    if (user) {
      query.where.userId = user
    }

    // Date range filter
    if (fromDate && toDate) {
      query.where.date = {
        [Op.between]: [new Date(fromDate), new Date(toDate)]
      };
    } else if (fromDate) {
      query.where.date = {
        [Op.gte]: new Date(fromDate)
      };
    } else if (toDate) {
      query.where.date = {
        [Op.lte]: new Date(toDate)
      };
    }

    const { count, rows } = await Regularization.findAndCountAll(query);

    const processedData = rows.map(item => ({
      ...item.get({ plain: true }),
      full_name: item.User.full_name,
    }));

    res.json({
      data: processedData,
      pagination: {
        total: count,
        page: parseInt(page),
        per_page: parseInt(per_page),
        total_pages: Math.ceil(count / per_page)
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// create regularization
exports.createRegularization = async (req, res) => {
  const { attendanceDate, attendanceUser, time, reason, remarks } = req.body

  if (!attendanceDate || !attendanceUser || !time || !reason || !remarks) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Create a new project record in the database
    const newRegularization = await Regularization.create({
      date: attendanceDate,
      userId: attendanceUser,
      punchTime: time,
      reason: reason,
      remarks: remarks
    });

    return res.status(200).json({
      message: 'Regularization created successfully',
      data: newRegularization,
    });
  } catch (error) {
    console.error('Error creating Regularization:', error);
    return res.status(500).json({
      message: 'Error creating Regularization. Please try again later.',
    });
  }
}

// regularization Approve By ID
exports.regularizationApproveByID = async (req, res) => {
  const Rid = req.params.id;
  const { approveId, userId, time, date } = req.body

  try {
    // Find the regularization by ID
    const regularization = await Regularization.findOne({ where: { id: Rid } });
    const findName = await User.findOne({ attributes: ['full_name'], where: { id: approveId } });

    if (!regularization) {
      return res.status(404).json({ message: 'Regularization not found' });
    }

    // Update the 'isApproved' status for the specific regularization record
    await Regularization.update(
      { status: 'Approved', updatedByID: approveId, updatedByName: findName.full_name },
      { where: { id: Rid } }
    );

    let timeForAttendance = `${date} ${time}`

    const addAttendance = await Attendance.create({
      userId: userId,
      date: date,
      time: timeForAttendance,
      imageURL: null,
      latitude: null,
      longitude: null,
    })

    // Return a success response
    return res.status(200).json({
      message: 'Regularization approved successfully',  // Correct success message
    });
  } catch (error) {
    console.log(error);
    // Return an error response if something goes wrong
    return res.status(500).json({ message: 'An error occurred while approving the regularization' });
  }
};

// regularization Reject By ID
exports.regularizationRejectByID = async (req, res) => {
  const Rid = req.params.id;
  const { userID } = req.body

  try {
    // Find the regularization by ID
    const regularization = await Regularization.findOne({ where: { id: Rid } });
    const findName = await User.findOne({ attributes: ['full_name'], where: { id: userID } });

    if (!regularization) {
      return res.status(404).json({ message: 'Regularization not found' });
    }

    // Update the 'isApproved' status for the specific regularization record
    await Regularization.update(
      { status: 'Rejected', updatedByID: userID, updatedByName: findName.full_name },
      { where: { id: Rid } }
    );

    // Return a success response
    return res.status(200).json({
      message: 'Regularization rejected successfully',  // Correct success message
    });
  } catch (error) {
    console.log(error);
    // Return an error response if something goes wrong
    return res.status(500).json({ message: 'An error occurred while approving the regularization' });
  }

}

// Handle file upload
exports.markAttendance = async (req, res) => {

  const { userId, latitude, longitude, imageURL } = req.body;

  const today = new Date();

  const dateOptions = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const timeOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

  const date = today.toLocaleDateString('en-IN', dateOptions).split('/').reverse().join('-');
  const time = today.toLocaleTimeString('en-IN', timeOptions);

  const timeIn = `${date} ${time}`;
  try {
    const checkAttendance = await Attendance.findOne({
      attributes: [
        'userId',
        'date',
        'time'
      ],
      where: {
        userId: userId
      },
      order: [
        ['createdAt', 'DESC']
      ]
    })

    if (checkAttendance) {
      const prevTimeStr = `${checkAttendance.time}`;

      // Convert both times to Date objects
      const currentTime = new Date(timeIn);
      const previousTime = new Date(prevTimeStr);

      const timeDifference = currentTime - previousTime; // in milliseconds

      if (timeDifference >= 60000) {
        const markAttendance = await Attendance.create({
          userId: userId,
          date: date,
          time: timeIn,
          imageURL: imageURL,
          latitude: latitude,
          longitude: longitude,
        });
        return res.status(200).json({
          success: true,
          data: markAttendance,
          message: 'Attendance added successfully!',
        });
      } else {
        return res.status(200).json({
          success: false,
          message: 'Attendance can only add after 1 minute',
        });
      }
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};