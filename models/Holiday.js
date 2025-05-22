const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');

const Holiday = sequelize.define('Holiday', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true, 
  },
  startDate: {
    type: DataTypes.DATE, 
    allowNull: true, 
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true, 
  },
  isDeleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW, 
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW, 
  },
}, {
  tableName: 'holiday', // Specify the table name explicitly
  timestamps: true, // Automatically manage createdAt and updatedAt fields
});


module.exports = Holiday;
