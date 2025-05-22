const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');

const PermissionSchema = sequelize.define('PermissionSchema', {
    srNo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    permission: {
        type: DataTypes.JSON,
    },
    createdAt: {
        type: DataTypes.DATE,
    },
    updatedAt: {
        type: DataTypes.DATE,
    }
}, {
    tableName: 'permission',
    timestamps: true,
});

module.exports = PermissionSchema;