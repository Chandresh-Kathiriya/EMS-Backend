const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');
const User = require('./User')
const Regularization = require('./Regularization')

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false, 
    references: {
      model: User,
      key: 'id'
      }
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false, 
  },
  time: {
    type: DataTypes.DATE, 
    allowNull: true, 
  },
  imageURL: {
    type: DataTypes.STRING,
    allowNull: true, 
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true, 
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true, 
  },
  isDeleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW, // Automatically sets the current timestamp
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW, // Automatically sets the current timestamp
  },
}, {
  tableName: 'attendance', // Specify the table name explicitly
  timestamps: true, // Automatically manage createdAt and updatedAt fields
});
Attendance.belongsTo(User, { foreignKey: 'userId', sourceKey: 'id' });
Attendance.belongsTo(Regularization, { foreignKey: 'userId', targetKey: 'userId' });


module.exports = Attendance;