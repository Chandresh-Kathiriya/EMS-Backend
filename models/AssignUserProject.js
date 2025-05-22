// models/AssignUserProject.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');
const User = require('./User');
const Project = require('./Project');

const AssignUserProject = sequelize.define('AssignUserProject', { 
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Project',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'User',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.STRING(255),
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
  },
}, {
  tableName: 'assignuserproject',
  timestamps: true,
});

AssignUserProject.belongsTo(User, { foreignKey: 'userId' });

module.exports = AssignUserProject;
