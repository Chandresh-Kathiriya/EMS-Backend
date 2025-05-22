const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');
const Leave = require('./Leave')

const LeaveType = sequelize.define('LeaveType', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  isDeleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'leavetype', // Specify the table name explicitly
  timestamps: true, // Automatically manage createdAt and updatedAt fields
});
// LeaveType.hasMany(Leave, { foreignKey: 'leaveType', sourceKey: 'id' });
// LeaveType.hasMany(Leave, { foreignKey: 'name', sourceKey: 'name' });

module.exports = LeaveType;