const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');

const LocationMaster = sequelize.define('LocationMaster', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true, 
  },
  isRangeRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  rangeArea: {
    type: DataTypes.INTEGER,
    allowNull: true
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
  tableName: 'locationmaster', 
  timestamps: true, 
});


module.exports = LocationMaster;
