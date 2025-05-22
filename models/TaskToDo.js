const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');
const Task = require('./Task')
const User = require('./User')

const TaskToDo = sequelize.define('TaskToDo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  taskCode: {
    type: DataTypes.STRING(255),
    references: {
      model: Task,
      key: 'code'
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  isDone: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  isDeleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  createdAt: {
    type: DataTypes.DATE,
  },
  updatedAt: {
    type: DataTypes.DATE,
  }
}, {
  tableName: 'tasktodo', // Specify the table name explicitly
  timestamps: true, // Automatically manage createdAt and updatedAt fields
});

module.exports = TaskToDo;