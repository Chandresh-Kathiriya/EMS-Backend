const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');

const AttendanceSetting = sequelize.define('AttendanceSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  image: {
    type: DataTypes.BOOLEAN,
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
  tableName: 'attendancesetting', 
  timestamps: true, 
});


module.exports = AttendanceSetting;
