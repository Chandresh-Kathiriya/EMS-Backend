// /src/models/task.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');

const User = require('./User');
const Project = require('./Project');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(10),
    unique: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  totalTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Done', 'Completed', 'Backlog', 'In Progress','Deployed'),
    allowNull: true
  },
  assignee: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  users: {
    type: DataTypes.JSON,
    allowNull: true
  },
  imageURL: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isDeleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
  },
  updatedAt: {
    type: DataTypes.DATE,
  }
}, {
  tableName: 'tasks',
  timestamps: true,
});

Task.belongsTo(User, { foreignKey: 'assignee', as: 'assigneeUser' });
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Task.belongsTo(User, { as: 'createdByUser', foreignKey: 'createdBy' });


module.exports = Task;