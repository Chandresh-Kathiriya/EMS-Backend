// /src/models/TaskTimer.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');
const User = require('./User')

const TaskTimer = sequelize.define('TaskTimer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  taskCode: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  message: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  isDeleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  duration: {
    type: DataTypes.STRING,
    defaultValue: '00:00:00'
  },
  createdAt: {
    type: DataTypes.DATE,
  },
  updatedAt: {
    type: DataTypes.DATE,
  }
}, {
  tableName: 'tasktimer',
  timestamps: true,
});
TaskTimer.belongsTo(User, { foreignKey: 'userId', sourceKey: 'id' });

module.exports = TaskTimer;