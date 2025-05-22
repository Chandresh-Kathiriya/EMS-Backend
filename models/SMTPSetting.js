const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');

const SMTPSetting = sequelize.define('SMTPSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  host: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fromName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  emailFrom: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  bbcEmail: {
    type: DataTypes.STRING(255),
    allowNull: false
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
  tableName: 'smtpsetting', 
  timestamps: true, 
});


module.exports = SMTPSetting;
