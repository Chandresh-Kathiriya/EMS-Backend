const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');
const Task = require('./Task')
const User = require('./User')

const TaskComment = sequelize.define('TaskComment', {
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
  text: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  imageURL: {
    type: DataTypes.JSON,
    allowNull: true
  },
  createdBy: {
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
  tableName: 'taskcomment', // Specify the table name explicitly
  timestamps: true, // Automatically manage createdAt and updatedAt fields
});
TaskComment.belongsTo(User, { foreignKey: 'createdBy', sourceKey: 'id' });

module.exports = TaskComment;