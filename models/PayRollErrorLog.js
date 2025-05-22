// models/PayrollErrorLog.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection'); // Assuming you have a sequelize instance

const PayRollErrorLog = sequelize.define('PayRollErrorLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  targetMonth: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  errorMessage: {
    type: DataTypes.TEXT('long'),
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
  tableName: 'payrollerrorlog', // Specify the table name explicitly
  timestamps: true, // Automatically manage createdAt and updatedAt fields
});


module.exports = PayRollErrorLog;