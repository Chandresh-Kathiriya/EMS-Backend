const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');

const ResetPassword = sequelize.define('ResetPassword', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    isUsed: {
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
    tableName: 'resetpassword', 
    timestamps: true, 
});

module.exports = ResetPassword;