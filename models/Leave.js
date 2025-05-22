// models/Leave.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');
const LeaveType = require('./LeaveType');

const Leave = sequelize.define('Leave', { // Removed the trailing space in 'User '
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user',  // Reference the User table directly
      key: 'id' // Use the 'emp_code' column from the User model
    }
  },
  empCode: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'user',  // Reference the User table directly
      key: 'empCode' // Use the 'emp_code' column from the User model
    }
  },
  leaveReason: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  leaveType: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: LeaveType,
      key: 'name'
    }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  startDay: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endDay: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Pending',
    allowNull: false,
  },
  isDeleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  createdAt: {
    type: DataTypes.DATE,
  },
  updatedAt: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'userleave', // Specify the table name explicitly
  timestamps: true, // Automatically manage createdAt and updatedAt fields
});
Leave.belongsTo(LeaveType, { foreignKey: 'leaveType', targetKey: 'id' });


module.exports = Leave;