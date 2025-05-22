// models/Regularization.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');
const User = require('./User')

const Regularization = sequelize.define('Regularization', { // Removed the trailing space in 'User '
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  punchTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  remarks: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(255),
    defaultValue: 'Pending',
    allowNull: true,
  },
  updatedByID: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  updatedByName: {
    type: DataTypes.STRING(255),
    allowNull:true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: true,
  },
}, {
    tableName: 'regularization', // Specify the table name explicitly
    timestamps: true, // Automatically manage createdAt and updatedAt fields
});
Regularization.belongsTo(User, { foreignKey: 'userId', sourceKey: 'id' });

module.exports = Regularization;