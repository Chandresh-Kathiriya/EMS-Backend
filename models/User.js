const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConnection');
const bcrypt = require('bcrypt');
const Role = require('./Role');
const Leave = require('./Leave');
const WeekOff = require('./WeekOff');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    empCode: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
    },
    full_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    dateOfBirth: {
        type: DataTypes.DATE,
        allowNull: true
    },
    mobileNumber: {
        type: DataTypes.INTEGER(10),
        allowNull: true,
    },
    gender: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    dateOfJoining: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    role_id: { // Foreign key to reference the Role
        type: DataTypes.INTEGER,
        references: {
            model: Role,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true
    },
    parent_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'user',
            key: 'id'
        }
    },
    weekOffId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'weekoff',
            key: 'id'
        }
    },
    is_deleted: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'user', // Specify the table name explicitly
    timestamps: true, // Automatically manage createdAt and updatedAt fields
});

// Define associations
User.belongsTo(Role, { foreignKey: 'role_id', as: 'Role' }); 
User.belongsTo(WeekOff, { foreignKey: 'weekOffId', as: 'weekOff' });
Leave.belongsTo(User, { foreignKey: 'empCode', targetKey: 'empCode' });

// User model
User.hasMany(Leave, { foreignKey: 'empCode', sourceKey: 'empCode' });
User.belongsTo(Role, { foreignKey: 'role_id', sourceKey: 'id' });
User.belongsTo(User, { as: 'reportingManager', foreignKey: 'parent_id' });

User.prototype.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

module.exports = User;