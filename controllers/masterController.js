// controllers/commonController.js

// import require core module and models
const Holiday = require('../models/Holiday');
const WeekOff = require('../models/WeekOff');
const LocationMaster = require('../models/LocationMaster');
const { Op, Sequelize } = require('sequelize');
const UserSalary = require('../models/UserSalary');
const User = require('../models/User');
const PayRoll = require('../models/PayRoll')

exports.getHolidays = async (req, res) => {
  try {
    const { page, per_page, fromDate, toDate, month, year } = req.body;

    let whereClause = {
      isDeleted: 0
    };

    // Date range filtering
    if (fromDate) {
      whereClause.startDate = { [Op.gte]: fromDate };
    }

    if (toDate) {
      whereClause.endDate = { [Op.lte]: toDate };
    }

    // Month & Year filter when no pagination
    if ((!page || !per_page) && month && year) {
      const startOfMonth = new Date(`${year}-${month.toString().padStart(2, '0')}-01`);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

      whereClause[Op.and] = [
        { startDate: { [Op.lte]: endOfMonth } },
        {
          [Op.or]: [
            { endDate: { [Op.gte]: startOfMonth } },
            { endDate: null }
          ]
        }
      ];
    }

    const query = {
      where: whereClause,
      order: [['createdAt', 'DESC']]
    };

    // If pagination is requested
    if (page && per_page) {
      const offset = (parseInt(page) - 1) * parseInt(per_page);
      query.limit = parseInt(per_page);
      query.offset = offset;
    }

    const { count, rows } = await Holiday.findAndCountAll(query);

    const processedRows = rows.map(row => {
      if (!row.endDate) {
        row.endDate = row.startDate;
      }
      // Format only if it's a Date object
      const endDateFormatted = row.endDate instanceof Date
        ? row.endDate.toISOString().split('T')[0]
        : row.endDate; // Already a string, keep it as is

      return {
        ...row.toJSON(),
        endDate: endDateFormatted
      };
    });

    res.json({
      success: true,
      data: processedRows,
      pagination: page && per_page ? {
        total: count,
        page: parseInt(page),
        per_page: parseInt(per_page),
        total_pages: Math.ceil(count / per_page)
      } : null
    });

  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching holiday data',
      error: error.message
    });
  }
};

exports.addHoliday = async (req, res) => {
  let { name, startDate, endDate } = req.body
  try {
    if (!endDate) {
      endDate = startDate
    }
    const holiday = await Holiday.create({ name, startDate, endDate });
    return res.status(200).json({ message: "Holiday created successfully", });
  } catch (error) {
    console.log(error)
  }
}

exports.updateHoliday = async (req, res) => {
  const holidayId = req.params.holidayId
  const { name, startDate, endDate } = req.body
  try {
    const holiday = await Holiday.update({ name, startDate, endDate }, { where: { id: holidayId } });
    return res.status(200).json({ message: "Holiday updated successfully", });
  } catch (error) {
    console.log(error)
  }
}

exports.deleteHoliday = async (req, res) => {
  const holidayId = req.params.holidayId
  try {
    const holiday = await Holiday.update({ isDeleted: 1 }, { where: { id: holidayId } });
    return res.status(200).json({ message: "Holiday Deleted", });
  } catch (error) {
    console.log(error)
  }
}

exports.createLocationMaster = async (req, res) => {
  try {
    const { name, isRangeRequired, rangeArea, latitude, longitude } = req.body;

    // Check if name already exists
    const exist = await LocationMaster.findOne({ where: { name } });
    if (exist) {
      return res.json({
        message: 'Name already exists in location master.'
      });
    }

    // Create new location
    const createLocationMaster = await LocationMaster.create({
      name,
      isRangeRequired,
      rangeArea,
      latitude,
      longitude
    });

    return res.status(201).json({
      message: 'Location Master created successfully!',
      data: createLocationMaster
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while creating location master.',
      error: error.message
    });
  }
};

exports.editLocationMaster = async (req, res) => {
  try {
    const { id, name, isRangeRequired, rangeArea, latitude, longitude } = req.body

    const findLocationMaster = await LocationMaster.findOne({
      where: {
        id: id
      }
    })

    if (findLocationMaster) {
      findLocationMaster.name = name;
      findLocationMaster.isRangeRequired = isRangeRequired;
      findLocationMaster.rangeArea = rangeArea;
      findLocationMaster.latitude = latitude;
      findLocationMaster.longitude = longitude;

      await findLocationMaster.save();

      return res.status(201).json({
        message: 'Location Master updated successfully!',
        data: findLocationMaster
      });
    } else {
      return res.status(500).json({
        message: 'Location Master is not available',
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while updating location master.',
      error: error.message
    });
  }
}

exports.getLocationMaster = async (req, res) => {
  try {
    const { page = 1, per_page = 10 } = req.body;
    const offset = (page - 1) * per_page;

    let query = {
      limit: parseInt(per_page),
      offset: offset,
      where: {
        isDeleted: 0
      },
      order: [
        ['createdAt', 'DESC'],
      ]
    };

    const { count, rows } = await LocationMaster.findAndCountAll(query);

    res.json({
      success: true,
      data: rows.map(row => ({
        ...row.toJSON(),
        isRangeRequired: row.isRangeRequired === true ? 'Yes' : 'No',
        rangeArea: row.rangeArea + ' meter'
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        per_page: parseInt(per_page),
        total_pages: Math.ceil(count / per_page)
      }
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching data',
    });
  }
}

exports.deleteLocationMaster = async (req, res) => {
  try {
    const { id } = req.body
    const findLocationMaster = await LocationMaster.findOne({
      where: {
        id: id
      }
    })
    if (findLocationMaster) {
      findLocationMaster.isDeleted = 1;

      await findLocationMaster.save();

      return res.status(201).json({
        message: 'Location Master deleted successfully!',
        data: findLocationMaster
      });
    } else {
      return res.status(500).json({
        message: 'Location Master is not available',
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while deleting location master.',
      error: error.message
    });
  }
}

exports.addWeekOff = async (req, res) => {
  try {
    const { weekOffName, effectiveDate, days, user } = req.body;

    const weekOff = await WeekOff.create({
      name: weekOffName,
      effectiveDate: effectiveDate,
      days: days,
      createdBy: user,
      updatedBy: user,
    });

    return res.status(201).json({ message: 'WeekOff created successfully!' });

  } catch (error) {
    console.error('Error creating WeekOff:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

exports.getWeekOff = async (req, res) => {
  try {
    const { page = 1, per_page = 10, fromDate, toDate } = req.body;
    const offset = (page - 1) * per_page;

    let query = {
      limit: parseInt(per_page),
      offset: offset,
      where: {
        isDeleted: 0
      },
      order: [
        ['createdAt', 'DESC'],
      ]
    };

    if (fromDate && toDate) {
      query.where.effectiveDate = {
        [Op.between]: [fromDate, toDate]
      };
    } else if (fromDate) {
      query.where.effectiveDate = {
        [Op.gte]: fromDate
      };
    } else if (toDate) {
      query.where.effectiveDate = {
        [Op.lte]: toDate
      };
    }

    const { count, rows } = await WeekOff.findAndCountAll(query);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        per_page: parseInt(per_page),
        total_pages: Math.ceil(count / per_page)
      }
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching data',
    });
  }
}

exports.getAllWeekOff = async (req, res) => {
  try {
    let query = {
      where: {
        isDeleted: 0
      },
      order: [
        ['createdAt', 'DESC'],
      ]
    };

    const rows = await WeekOff.findAll(query);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching data',
    });
  }
}

exports.deleteWeekOff = async (req, res) => {
  const { id } = req.body
  try {
    const deleteWeekOff = await WeekOff.update({ isDeleted: 1 }, { where: { id: id } })
    res.json({
      success: true,
      message: 'WeekOff Deleted Successfully!!'

    });
  } catch (error) {
    console.log(error)
  }
}

exports.editWeekOff = async (req, res) => {
  const { id, weekOffName, effectiveDate, user, days } = req.body
  console.log(id, "ID")
  try {
    let editWeekOff = await WeekOff.findOne({ where: { id: id } });

    if (editWeekOff) {
      editWeekOff.name = weekOffName;
      editWeekOff.effectiveDate = effectiveDate;
      editWeekOff.updatedBy = user;
      editWeekOff.days = days;

      // Save the updated task
      await editWeekOff.save();

      res.json({
        success: true,
        message: 'WeekOff Edited Successfully!!'
      });
    }
  } catch (error) {
    console.log(error)
  }
}

exports.getUserSalary = async (req, res) => {
  try {
    const { page = 1, per_page = 10, user, minSalary, maxSalary, fromDate, toDate, isActive } = req.body;
    const offset = (page - 1) * per_page;

    let query = {
      limit: parseInt(per_page),
      offset: offset,
      order: [
        ['createdAt', 'DESC'],
      ]
    };

    const whereConditions = {
      isDeleted: 0,
    };

    if (user) {
      const findUserIds = await User.findAll({
        attributes: ['id'],
        where: {
          full_name: {
            [Op.like]: `%${user}%`, // Case-insensitive match
          },
          is_deleted: 0
        },
      });

      if (findUserIds.length > 0) {
        const userIdsArray = findUserIds.map(u => u.dataValues.id);

        whereConditions.userId = {
          [Op.in]: userIdsArray
        };
      } else {
        return res.json({
          success: false,
          message: 'No User Available',
          data: [],
          pagination: {
            pagination: {
              total: 1,
              page: page,
              per_page: per_page,
              total_pages: 1,
            },
          }
        });
      }
    }

    if (minSalary && maxSalary) {
      whereConditions.amount = {
        [Op.between]: [minSalary, maxSalary]
      };
    } else {
      if (minSalary) {
        whereConditions.amount = {
          [Op.gte]: minSalary
        };
      }

      if (maxSalary) {
        whereConditions.amount = {
          [Op.lte]: maxSalary
        };
      }
    }

    if (fromDate && toDate) {
      whereConditions.effectiveDate = {
        [Op.between]: [fromDate, toDate]
      };
    } else {
      if (fromDate) {
        whereConditions.effectiveDate = {
          [Op.gte]: fromDate
        };
      }

      if (toDate) {
        whereConditions.effectiveDate = {
          [Op.lte]: toDate
        };
      }
    }

    if (typeof isActive !== 'undefined') {
      whereConditions.isActive = isActive === 'true' || isActive === true ? 1 : 0;
    }

    const { count, rows } = await UserSalary.findAndCountAll({
      ...query,
      where: whereConditions,
      attributes: ['id', 'userId', 'effectiveDate', 'amount', 'isActive'],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name'],
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Salary Data fetched successfully!',
      data: rows.map(salary => ({
        ...salary.toJSON(),
        user: salary?.user?.full_name || null,
        isActive: salary?.isActive ? 'Yes' : 'No'
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        per_page: parseInt(per_page),
        total_pages: Math.ceil(count / per_page)
      }
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching data',
    });
  }
}

exports.createUserSalary = async (req, res) => {
  try {
    const { user, effectiveDate, salary, isActive, parentUser } = req.body;

    if (isActive) {
      const existingSalaries = await UserSalary.findAll({
        where: {
          userId: user,
          isActive: 1
        }
      });

      // Set all current active salaries to inactive
      for (const salaryRecord of existingSalaries) {
        salaryRecord.isActive = 0;
        await salaryRecord.save();
      }
    }

    const createSalary = await UserSalary.create({
      userId: parseInt(user),
      effectiveDate,
      amount: parseFloat(salary),
      isActive: isActive ? isActive : 0,
      createdBy: parentUser,
      updatedBy: parentUser,
    });

    return res.status(201).json({
      success: true,
      message: 'Salary created successfully!',
      data: createSalary
    });

  } catch (error) {
    console.error('Error creating salary:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating salary',
    });
  }
}

exports.editUserSalary = async (req, res) => {
  try {
    const { id, user, effectiveDate, salary, isActive, parentUser } = req.body

    if (isActive) {
      const existingSalaries = await UserSalary.findAll({
        where: {
          userId: user,
          isActive: 1
        }
      });

      // Set all current active salaries to inactive
      for (const salaryRecord of existingSalaries) {
        salaryRecord.isActive = 0;
        await salaryRecord.save();
      }
    }

    const findUserSalary = await UserSalary.findOne({
      where: {
        id
      }
    })

    if (findUserSalary) {
      findUserSalary.user = user;
      findUserSalary.effectiveDate = effectiveDate;
      findUserSalary.amount = salary;
      findUserSalary.isActive = isActive;
      findUserSalary.updatedBy = parentUser;

      await findUserSalary.save();

      return res.status(200).json({
        success: true,
        message: 'Salary updated successfully',
        data: findUserSalary,
      });
    } else {
      console.error('Error fetching data:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching data',
      });
    }

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching data',
    });
  }
}

exports.deleteUserSalary = async (req, res) => {
  try {
    const { id } = req.body

    const findUserSalary = await UserSalary.findOne({
      where: {
        id
      }
    })

    if (findUserSalary) {
      findUserSalary.isDeleted = 1;

      await findUserSalary.save();

      return res.status(200).json({
        success: true,
        message: 'Salary deleted successfully',
        data: findUserSalary,
      });
    } else {
      console.error('Error fetching data:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching data',
      });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching data',
    });
  }
}

exports.getPayRoll = async (req, res) => {
  try {
    const { page = 1, per_page = 10, user, fromDate, startDate, endDate, empCode, status } = req.body
    const offset = (page - 1) * per_page;

    let query = {
      limit: parseInt(per_page),
      offset: offset,
      order: [
        ['month', 'DESC'],
      ]
    };

    const whereConditions = {
      isDeleted: 0,
    };

    if (user) {
      whereConditions.userId = user
    }

    if (fromDate) {
      whereConditions.month = {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(fromDate)], // Start date filter
      };
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setDate(1); 
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setMonth(end.getMonth()); 

      whereConditions.month = {
        [Sequelize.Op.between]: [start, end], 
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setDate(1); 
      start.setHours(0, 0, 0, 0); 

      const end = new Date(start); 
      end.setMonth(end.getMonth() + 1); 
      end.setDate(0); 
      end.setHours(23, 59, 59, 999); 

      whereConditions.month = {
        [Sequelize.Op.between]: [start, end],
      };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setMonth(end.getMonth() + 1); 
      end.setDate(0);
      end.setHours(23, 59, 59, 999);

      whereConditions.month = {
        [Sequelize.Op.lte]: end,
      };
    }

    if (empCode) {
      whereConditions.userId = empCode
    }

    if (status) {
      whereConditions.status = status
    }

    const { count, rows } = await PayRoll.findAndCountAll({
      ...query,
      where: whereConditions,
      attributes: ['id', 'userId', 'actualWorkingDays', 'baseSalary', 'deduction', 'leave', 'month', 'officialWorkingDays', 'payable', 'status'],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name'],
        }
      ]
    });

    if (rows) {
      const flattened = rows.map(rows => {
        return {
          ...rows.toJSON(),
          full_name: rows.user?.full_name,
        };
      });
      return res.status(200).json({
        success: true,
        message: 'PayRoll Data Fetch successfully',
        data: flattened,
        pagination: {
          total: count,
          page: parseInt(page),
          per_page: parseInt(per_page),
          total_pages: Math.ceil(count / per_page)
        }
      });
    } else {
      return res.json({
        success: false,
        message: 'PayRoll Data is not available',
      });
    }
  } catch (error) {
    console.log(error)
    return res.json({
      success: false,
      message: 'Error while fetching data',
    });
  }
}

exports.updateStatusPayRoll = async (req, res) => {
  try {
    const { id, status } = req.body

    const findPayRoll = await PayRoll.findOne({
      where: {
        id: id
      }
    })
    if (findPayRoll) {
      findPayRoll.status = status

      await findPayRoll.save()

      return res.json({
        success: true,
        message: 'PayRoll Status Updated.',
      });
    } else {
      return res.json({
        success: false,
        message: 'PayRoll Data is not available',
      });
    }
  } catch (error) {
    console.log(error)
    return res.json({
      success: false,
      message: 'Error while Updating Status',
    });
  }
}