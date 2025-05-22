// models/Leave.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');
const User = require('./User');

const PayRoll = sequelize.define('PayRoll', { 
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user',
      key: 'id'
    }
  },
  month: {
    type: DataTypes.STRING, 
    allowNull: false,
  },
  baseSalary: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  officialWorkingDays: {
    type: DataTypes.FLOAT, 
    allowNull: false
  },
  actualWorkingDays: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  deduction: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  leave: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  payable: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Pending'
  },
  isDeleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE
  },
  updatedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'payroll',
  timestamps: true
});

PayRoll.belongsTo(User, { as: 'user', foreignKey: 'userId' });

module.exports = PayRoll;